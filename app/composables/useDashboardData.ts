import { ref, computed, readonly, watch } from "vue";
import { db, isElectron } from "@/lib/db";
import { useRawWebSocket } from "@/composables/useWebSocket";
import type {
  DashboardMetric,
  ZoneData,
  ActivityItem,
  AlertItem,
  EventItem,
  ChartDataPoint,
  DashboardData,
} from "@/types";
import {
  defaultMetrics,
  defaultZones,
  mockZonesData,
  mockActivityData,
  mockAlertsData,
  mockEventsData,
  defaultSystemHealth,
  monthlyPerformanceData,
} from "@/lib/mock";

class DashboardDataManager {
  private data = ref<DashboardData>({
    metrics: defaultMetrics,
    zones: defaultZones,
    recentActivity: [],
    alerts: [],
    upcomingEvents: [],
    charts: {
      teacherDistribution: [],
      documentTrends: [],
      certificationStatus: [],
    },
    systemHealth: [
      { label: "Database", value: 98, status: "healthy" },
      { label: "Sync Engine", value: 95, status: "healthy" },
      { label: "API Response", value: 87, status: "warning" },
      { label: "Storage", value: 72, status: "healthy" },
    ],
    lastUpdated: new Date(),
  });

  private isLoading = ref(true);
  private error = ref<string | null>(null);
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribeElectron: (() => void) | null = null;
  private wsUnsubscribe: (() => void) | null = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (isElectron()) {
      await this.initElectron();
    } else {
      await this.initWeb();
    }
  }

  /**
   * Initialize for Electron environment
   * Listens for database change broadcasts from main process
   */
  private async initElectron() {
    await this.initWeb();
    // Load initial data from local database
    await this.loadFromLocalDB();

    // Subscribe to database change events from Electron main process
    if (window.electronAPI?.onDatabaseChange) {
      this.unsubscribeElectron = window.electronAPI.onDatabaseChange(
        (event: { table: string; action: string; data?: any }) => {
          this.handleDatabaseChange(event);
        },
      );
    }

    // Set up periodic refresh (every 2 minutes for local data)
    this.refreshInterval = setInterval(
      () => {
        this.loadFromLocalDB();
      },
      2 * 60 * 1000,
    );
  }

  /**
   * Initialize for Web environment
   * Fetches data from API and sets up WebSocket for real-time updates
   */
  private async initWeb() {
    // Load initial data from API
    await this.loadFromAPI();

    // Set up WebSocket connection for real-time updates
    this.setupWebSocket();

    // Set up periodic refresh (every 5 minutes as fallback)
    this.refreshInterval = setInterval(
      () => {
        this.loadFromAPI();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Load dashboard data from local NeDB database (Electron)
   */
  private async loadFromLocalDB() {
    this.isLoading.value = true;
    this.error.value = null;

    try {
      // Fetch teachers count
      const teachers = await db.find("staff", {});
      const teacherCount = teachers.length;

      // Fetch schools count
      const schools = await db.find("schools", {});
      const schoolCount = schools.length;

      // Fetch pending transfers
      const transfers = await db.find("transfers", { status: "pending" });
      const pendingTransfers = transfers.length;
      const urgentTransfers = transfers.filter(
        (t: any) => t.priority === "urgent",
      ).length;

      // Fetch documents processed this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const documents = await db.find("scanned_records", {});
      const documentsThisMonth = documents.filter(
        (d: any) => new Date(d.createdAt) >= startOfMonth,
      ).length;

      // Fetch recent activity
      const activityLogs = await db.find(
        "staff_logs",
        {},
        { sort: { createdAt: -1 }, limit: 10 },
      );

      // Calculate zone distribution
      const zoneDistribution = this.calculateZoneDistribution(teachers);

      // Update metrics
      const updatedMetrics = [...defaultMetrics];

      // Teachers
      updatedMetrics[0] = {
        ...updatedMetrics[0],
        value: teacherCount.toLocaleString(),
        change: "+12",
        changePercent: "+2.3%",
        changeType: teacherCount > 0 ? "increase" : "neutral",
      } as DashboardMetric;

      // Zones & Schools
      updatedMetrics[2] = {
        ...updatedMetrics[2],
        value: `6 / ${schoolCount}`,
        change: `${schoolCount}`,
        changeLabel: "schools total",
      } as DashboardMetric;

      // Transfers
      updatedMetrics[3] = {
        ...updatedMetrics[3],
        value: pendingTransfers.toString(),
        change: urgentTransfers.toString(),
        changeLabel: "urgent",
        changeType: urgentTransfers > 0 ? "decrease" : "neutral",
      } as DashboardMetric;

      // Documents
      updatedMetrics[4] = {
        ...updatedMetrics[4],
        value: documentsThisMonth.toLocaleString(),
        change: `+${documentsThisMonth}`,
        changePercent: "+9.2%",
        changeType: documentsThisMonth > 0 ? "increase" : "neutral",
      } as DashboardMetric;

      // System Health
      updatedMetrics[5] = {
        ...updatedMetrics[5],
        value: "99.7%",
        changeLabel: "Excellent uptime",
      } as DashboardMetric;

      // Map activity logs to ActivityItem format
      const recentActivity: ActivityItem[] = activityLogs.map((log: any) => ({
        id: log._id,
        type: this.getActivityType(log.action),
        title: log.action || "System Activity",
        description: log.details || "",
        actor: log.performedBy || "System",
        timestamp: new Date(log.createdAt),
        entity: log.targetEntity,
        status: log.status || "info",
      }));

      // Update zones data
      const updatedZones = defaultZones.map((zone, index) => ({
        ...zone,
        teacherCount: zoneDistribution[index]?.count || 0,
        schoolCount: Math.floor(Math.random() * 30) + 15,
        growth: `+${Math.floor(Math.random() * 15)}%`,
      }));

      // Update chart data
      const chartData = {
        teacherDistribution: updatedZones.map((z) => ({
          label: z.name,
          value: z.teacherCount,
        })),
        documentTrends: this.generateDocumentTrends(),
        certificationStatus: [
          { label: "Active", value: Math.floor(teacherCount * 0.62) },
          { label: "Expiring Soon", value: Math.floor(teacherCount * 0.17) },
          { label: "Expired", value: Math.floor(teacherCount * 0.04) },
          { label: "Pending", value: Math.floor(teacherCount * 0.17) },
        ],
      };

      this.data.value = {
        ...this.data.value,
        metrics: updatedMetrics,
        zones: updatedZones,
        recentActivity,
        charts: chartData,
        lastUpdated: new Date(),
      };
    } catch (err) {
      console.error("Failed to load dashboard data from local DB:", err);
      this.error.value = "Failed to load dashboard data";
    } finally {
      this.isLoading.value = false;
    }
  }

  /**
   * Load dashboard data from API (Web)
   */
  private async loadFromAPI() {
    this.isLoading.value = true;
    this.error.value = null;

    try {
      const response = await $fetch<{ data: DashboardData }>(
        "/nn/api/dashboard",
        {
          method: "GET",
        },
      );

      if (response?.data) {
        this.data.value = {
          ...response.data,
          lastUpdated: new Date(),
        };
      } else {
        await this.loadMockData();
      }
    } catch (err: any) {
      console.error("Failed to load dashboard data from API:", err);
      this.error.value = err.message || "Failed to load dashboard data";

      // Use mock data as fallback
      await this.loadMockData();
    } finally {
      this.isLoading.value = false;
    }
  }

  /**
   * Load mock data for development/demo purposes
   */
  private async loadMockData() {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockMetrics = [...defaultMetrics];

    mockMetrics[0] = {
      ...mockMetrics[0],
      value: "5,247",
      change: "+12",
      changePercent: "+2.3%",
      changeType: "increase",
    } as DashboardMetric;
    mockMetrics[1] = {
      ...mockMetrics[1],
      value: "0",
      change: "0",
      changePercent: "0%",
      changeType: "neutral",
    } as DashboardMetric;
    mockMetrics[2] = {
      ...mockMetrics[2],
      value: "6 / 142",
      change: "142",
      changeLabel: "schools total",
    } as DashboardMetric;
    mockMetrics[3] = {
      ...mockMetrics[3],
      value: "23",
      change: "5",
      changeLabel: "urgent",
      changeType: "decrease",
    } as DashboardMetric;
    mockMetrics[4] = {
      ...mockMetrics[4],
      value: "1,234",
      change: "+156",
      changePercent: "+9.2%",
      changeType: "increase",
    } as DashboardMetric;
    mockMetrics[5] = {
      ...mockMetrics[5],
      value: "99.7%",
      changeLabel: "Excellent uptime",
    } as DashboardMetric;

    this.data.value = {
      metrics: mockMetrics,
      zones: mockZonesData,
      recentActivity: mockActivityData,
      alerts: mockAlertsData,
      upcomingEvents: mockEventsData,
      charts: {
        teacherDistribution: mockZonesData.map((z) => ({
          label: z.name,
          value: z.teacherCount,
        })),
        documentTrends: this.generateDocumentTrends(),
        certificationStatus: [
          { label: "Active", value: 3245 },
          { label: "Expiring Soon", value: 892 },
          { label: "Expired", value: 234 },
          { label: "Pending", value: 863 },
        ],
      },
      systemHealth: defaultSystemHealth,
      lastUpdated: new Date(),
    };
  }

  /**
   * Set up WebSocket listener for real-time updates (Web)
   * Connection is managed by useWebSocketConnection in app layout
   */
  private setupWebSocket() {
    try {
      const { client, isConnected } = useRawWebSocket();

      // Function to set up subscription and listener when client is actually connected
      const setupChannelSubscription = () => {
        // Check both the client exists AND it's actually connected (not just the global ref)
        if (!client.value || !client.value.isConnected) {
          return;
        }

        // Subscribe to dashboard channel
        client.value.subscribe("dashboard");

        // Set up listener if not already set
        if (!this.wsUnsubscribe) {
          this.wsUnsubscribe = client.value.on(
            "dashboard_update",
            (data: Partial<DashboardData>) => {
              this.handleWebSocketUpdate(data);
            },
            "dashboard",
          );
        }
      };

      // Watch for client availability and connection status changes
      watch(
        [() => client.value, isConnected],
        ([clientVal, connected]) => {
          // Only attempt subscription if global ref says connected
          // The setupChannelSubscription will verify actual connection
          if (clientVal && connected) {
            setupChannelSubscription();
          }
        },
        { immediate: true },
      );
    } catch (err) {
      console.error("Failed to setup WebSocket listener:", err);
    }
  }

  /**
   * Handle WebSocket update for web
   */
  private handleWebSocketUpdate(updateData: Partial<DashboardData>) {
    this.data.value = {
      ...this.data.value,
      ...updateData,
      lastUpdated: new Date(),
    };
  }

  /**
   * Handle database change event from Electron
   */
  private async handleDatabaseChange(event: {
    table: string;
    action: string;
    data?: any;
  }) {
    // Reload relevant data based on changed table
    const tablesToWatch = [
      "staff",
      "schools",
      "transfers",
      "scanned_records",
      "staff_logs",
    ];

    if (tablesToWatch.includes(event.table)) {
      await this.loadFromLocalDB();
    }
  }

  /**
   * Calculate zone distribution from teachers data
   */
  private calculateZoneDistribution(
    teachers: any[],
  ): { zone: string; count: number }[] {
    const zones = [
      "Enugu North",
      "Enugu South",
      "Enugu East",
      "Nsukka",
      "Udi",
      "Awgu",
    ];
    const distribution = zones.map((zone) => ({
      zone,
      count: teachers.filter((t: any) => t.zone === zone).length,
    }));
    return distribution;
  }

  /**
   * Generate document trends data for chart
   */
  private generateDocumentTrends(): ChartDataPoint[] {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months.map((month) => ({
      label: month,
      value: Math.floor(Math.random() * 500) + 1000,
    }));
  }

  /**
   * Get activity type from action string
   */
  private getActivityType(action: string): ActivityItem["type"] {
    const actionLower = action?.toLowerCase() || "";
    if (actionLower.includes("transfer")) return "transfer";
    if (actionLower.includes("document") || actionLower.includes("scan"))
      return "document";
    if (actionLower.includes("certif")) return "certification";
    if (
      actionLower.includes("user") ||
      actionLower.includes("teacher") ||
      actionLower.includes("staff")
    )
      return "user";
    if (actionLower.includes("mail") || actionLower.includes("correspondence"))
      return "mail";
    return "system";
  }

  /**
   * Refresh dashboard data
   */
  public async refresh() {
    if (isElectron()) {
      await this.loadFromLocalDB();
    } else {
      await this.loadFromAPI();
    }
  }

  /**
   * Dismiss an alert
   */
  public dismissAlert(alertId: string) {
    this.data.value = {
      ...this.data.value,
      alerts: this.data.value.alerts.filter((a) => a.id !== alertId),
    };
  }

  /**
   * Get current data
   */
  public getData() {
    return readonly(this.data);
  }

  /**
   * Get loading state
   */
  public getIsLoading() {
    return readonly(this.isLoading);
  }

  /**
   * Get error state
   */
  public getError() {
    return readonly(this.error);
  }

  /**
   * Cleanup resources
   */
  public cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.unsubscribeElectron) {
      this.unsubscribeElectron();
    }
    if (this.wsUnsubscribe) {
      this.wsUnsubscribe();
    }
    // Note: WebSocket connection is managed globally by useWebSocketConnection
  }
}

// Singleton instance
let dashboardManager: DashboardDataManager | null = null;

function getDashboardManager(): DashboardDataManager {
  if (!dashboardManager) {
    dashboardManager = new DashboardDataManager();
  }
  return dashboardManager;
}

/**
 * Dashboard Data Composable Hook
 */
export function useDashboardData() {
  const manager = getDashboardManager();
  const data = manager.getData();
  const isLoading = manager.getIsLoading();
  const error = manager.getError();

  //cleanup
  const cleanup = () => manager.cleanup();

  // Computed properties
  const metrics = computed(() => data.value.metrics);
  const zones = computed(() => data.value.zones);
  const recentActivity = computed(() => data.value.recentActivity);
  const alerts = computed(() => data.value.alerts);
  const upcomingEvents = computed(() => data.value.upcomingEvents);
  const charts = computed(() => data.value.charts);
  const systemHealth = computed(() => data.value.systemHealth);
  const lastUpdated = computed(() => data.value.lastUpdated);

  // Top zones (sorted by teacher count)
  const topZones = computed(() =>
    [...zones.value]
      .sort((a, b) => b.teacherCount - a.teacherCount)
      .slice(0, 3),
  );

  // Critical alerts count
  const criticalAlertsCount = computed(
    () => alerts.value.filter((a) => a.severity === "critical").length,
  );

  // Actions
  const refresh = () => manager.refresh();
  const dismissAlert = (id: string) => manager.dismissAlert(id);

  return {
    // Data
    data,
    metrics,
    zones,
    recentActivity,
    alerts,
    upcomingEvents,
    charts,
    systemHealth,
    lastUpdated,
    monthlyPerformanceData,

    // Computed
    topZones,
    criticalAlertsCount,

    // State
    isLoading,
    error,

    // Actions
    refresh,
    dismissAlert,
    cleanup,

    // Environment
    isElectron: isElectron(),
  };
}
