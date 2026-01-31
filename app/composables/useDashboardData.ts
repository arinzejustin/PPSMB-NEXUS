import { ref, computed, readonly } from "vue";
import { db, isElectron } from "@/lib/db";
import { useWebSocketClient } from "@/lib/websocket";
import { useUser } from "@/composables/useUserStates";
import type {
  DashboardMetric,
  ZoneData,
  ActivityItem,
  AlertItem,
  EventItem,
  ChartDataPoint,
  DashboardData,
} from "@/types";

// Default/mock data for initial load and offline mode
const defaultMetrics: DashboardMetric[] = [
  {
    id: "teachers",
    title: "Total Teachers",
    value: "0",
    change: "+0",
    changePercent: "0%",
    changeType: "neutral",
    changeLabel: "vs last month",
    icon: "Users",
    gradient: "from-blue-500 via-blue-600 to-indigo-600",
    bgGradient: "from-blue-500/10 to-indigo-500/5",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    route: "/staff",
  },
  {
    id: "students",
    title: "Total Students",
    value: "0",
    change: "+0",
    changePercent: "0%",
    changeType: "neutral",
    changeLabel: "from last month",
    icon: "GraduationCap",
    gradient: "from-emerald-500 via-emerald-600 to-teal-600",
    bgGradient: "from-emerald-500/10 to-teal-500/5",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badge: "Coming Soon",
  },
  {
    id: "zones",
    title: "Active Zones",
    value: "0",
    change: "0",
    changePercent: "",
    changeType: "neutral",
    changeLabel: "schools total",
    icon: "MapPin",
    gradient: "from-violet-500 via-violet-600 to-purple-600",
    bgGradient: "from-violet-500/10 to-purple-500/5",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    route: "/zones",
  },
  {
    id: "transfers",
    title: "Pending Transfers",
    value: "0",
    change: "0",
    changePercent: "",
    changeType: "neutral",
    changeLabel: "urgent",
    icon: "ArrowLeftRight",
    gradient: "from-amber-500 via-amber-600 to-orange-600",
    bgGradient: "from-amber-500/10 to-orange-500/5",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    route: "/staff/transfers",
  },
  {
    id: "documents",
    title: "Documents Processed",
    value: "0",
    change: "+0",
    changePercent: "0%",
    changeType: "neutral",
    changeLabel: "this month",
    icon: "FileText",
    gradient: "from-teal-500 via-teal-600 to-cyan-600",
    bgGradient: "from-teal-500/10 to-cyan-500/5",
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-600 dark:text-teal-400",
    route: "/documents",
  },
  {
    id: "health",
    title: "System Health",
    value: "0%",
    change: "",
    changePercent: "",
    changeType: "neutral",
    changeLabel: "uptime",
    icon: "Heart",
    gradient: "from-rose-500 via-rose-600 to-pink-600",
    bgGradient: "from-rose-500/10 to-pink-500/5",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
];

const defaultZones: ZoneData[] = [
  {
    id: "1",
    name: "Enugu North",
    code: "EN",
    administrator: "N/A",
    teacherCount: 0,
    schoolCount: 0,
    studentCount: 0,
    pendingItems: 0,
    health: "healthy",
    lastSync: new Date(),
    growth: "0%",
  },
  {
    id: "2",
    name: "Enugu South",
    code: "ES",
    administrator: "N/A",
    teacherCount: 0,
    schoolCount: 0,
    studentCount: 0,
    pendingItems: 0,
    health: "healthy",
    lastSync: new Date(),
    growth: "0%",
  },
  {
    id: "3",
    name: "Enugu East",
    code: "EE",
    administrator: "N/A",
    teacherCount: 0,
    schoolCount: 0,
    studentCount: 0,
    pendingItems: 0,
    health: "healthy",
    lastSync: new Date(),
    growth: "0%",
  },
  {
    id: "4",
    name: "Nsukka",
    code: "NS",
    administrator: "N/A",
    teacherCount: 0,
    schoolCount: 0,
    studentCount: 0,
    pendingItems: 0,
    health: "healthy",
    lastSync: new Date(),
    growth: "0%",
  },
  {
    id: "5",
    name: "Udi",
    code: "UD",
    administrator: "N/A",
    teacherCount: 0,
    schoolCount: 0,
    studentCount: 0,
    pendingItems: 0,
    health: "healthy",
    lastSync: new Date(),
    growth: "0%",
  },
  {
    id: "6",
    name: "Awgu",
    code: "AW",
    administrator: "N/A",
    teacherCount: 0,
    schoolCount: 0,
    studentCount: 0,
    pendingItems: 0,
    health: "healthy",
    lastSync: new Date(),
    growth: "0%",
  },
];

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
  private wsConnection: ReturnType<typeof useWebSocketClient> | null = null;
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
    // await this.loadFromLocalDB();

    // // Subscribe to database change events from Electron main process
    // if (window.electronAPI?.onDatabaseChange) {
    //   this.unsubscribeElectron = window.electronAPI.onDatabaseChange(
    //     (event: { table: string; action: string; data?: any }) => {
    //       console.log("Database change detected:", event);
    //       this.handleDatabaseChange(event);
    //     },
    //   );
    // }

    // // Set up periodic refresh (every 2 minutes for local data)
    // this.refreshInterval = setInterval(
    //   () => {
    //     this.loadFromLocalDB();
    //   },
    //   2 * 60 * 1000,
    // );
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
      value: "52,340",
      change: "+234",
      changePercent: "+0.4%",
      changeType: "increase",
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

    const mockZones: ZoneData[] = [
      {
        id: "1",
        name: "Enugu North",
        code: "EN",
        administrator: "Mrs. Adaobi Nwankwo",
        teacherCount: 847,
        schoolCount: 28,
        studentCount: 8234,
        pendingItems: 3,
        health: "healthy",
        lastSync: new Date(),
        growth: "+5%",
      },
      {
        id: "2",
        name: "Enugu South",
        code: "ES",
        administrator: "Mr. Chukwuemeka Obi",
        teacherCount: 50,
        schoolCount: 30,
        studentCount: 9156,
        pendingItems: 1,
        health: "healthy",
        lastSync: new Date(),
        growth: "+8%",
      },
      {
        id: "3",
        name: "Enugu East",
        code: "EE",
        administrator: "Mrs. Ngozi Eze",
        teacherCount: 756,
        schoolCount: 19,
        studentCount: 7823,
        pendingItems: 5,
        health: "attention",
        lastSync: new Date(),
        growth: "+3%",
      },
      {
        id: "4",
        name: "Nsukka",
        code: "NS",
        administrator: "Dr. Emeka Nnamdi",
        teacherCount: 1024,
        schoolCount: 31,
        studentCount: 11234,
        pendingItems: 2,
        health: "healthy",
        lastSync: new Date(),
        growth: "+12%",
      },
      {
        id: "5",
        name: "Udi",
        code: "UD",
        administrator: "Mr. Ikechukwu Okoro",
        teacherCount: 689,
        schoolCount: 18,
        studentCount: 6892,
        pendingItems: 0,
        health: "healthy",
        lastSync: new Date(),
        growth: "+2%",
      },
      {
        id: "6",
        name: "Awgu",
        code: "AW",
        administrator: "Mrs. Chioma Ugwu",
        teacherCount: 1008,
        schoolCount: 22,
        studentCount: 9001,
        pendingItems: 4,
        health: "healthy",
        lastSync: new Date(),
        growth: "+6%",
      },
    ];

    const mockActivity: ActivityItem[] = [
      {
        id: "1",
        type: "transfer",
        title: "Transfer Request Approved",
        description:
          "Mrs. Adaobi Nwankwo transferred to Government Secondary School, Nsukka",
        actor: "Admin User",
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        status: "success",
      },
      {
        id: "2",
        type: "document",
        title: "Document Batch Processed",
        description:
          "24 documents from Enugu South Zone processed successfully",
        actor: "System",
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        status: "success",
      },
      {
        id: "3",
        type: "certification",
        title: "Certification Expiring",
        description: "12 teachers have certifications expiring within 30 days",
        actor: "System Alert",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: "warning",
      },
      {
        id: "4",
        type: "user",
        title: "New Teacher Registered",
        description: "Mr. Emmanuel Okonkwo added to the system",
        actor: "HR Admin",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        status: "info",
      },
      {
        id: "5",
        type: "mail",
        title: "Correspondence Received",
        description: "Official letter from Ministry of Education",
        actor: "Mail System",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        status: "info",
      },
    ];

    const mockAlerts: AlertItem[] = [
      {
        id: "1",
        severity: "critical",
        title: "5 Teacher Certifications Expiring This Week",
        description: "TRCN certifications for 5 teachers expire within 7 days",
        actionLabel: "View Details",
        actionRoute: "/certifications/expiring",
        dismissable: true,
        createdAt: new Date(),
      },
      {
        id: "2",
        severity: "warning",
        title: "3 Pending Transfer Approvals Overdue",
        description: "Transfer requests awaiting approval for over 7 days",
        actionLabel: "Review Now",
        actionRoute: "/staff/transfers",
        dismissable: true,
        createdAt: new Date(),
      },
      {
        id: "3",
        severity: "info",
        title: "System Maintenance Scheduled",
        description: "Scheduled maintenance on Feb 5, 2026 at 2:00 AM",
        dismissable: true,
        createdAt: new Date(),
      },
    ];

    const mockEvents: EventItem[] = [
      {
        id: "1",
        title: "Certification Renewal Deadline",
        date: "2026-01-30",
        type: "deadline",
        priority: "high",
      },
      {
        id: "2",
        title: "Bi-weekly Data Sync",
        date: "2026-01-29",
        type: "sync",
        priority: "medium",
      },
      {
        id: "3",
        title: "Quarterly Report Due",
        date: "2026-02-01",
        type: "report",
        priority: "high",
      },
      {
        id: "4",
        title: "Staff Training Session",
        date: "2026-02-05",
        type: "training",
        priority: "low",
      },
    ];

    this.data.value = {
      metrics: mockMetrics,
      zones: mockZones,
      recentActivity: mockActivity,
      alerts: mockAlerts,
      upcomingEvents: mockEvents,
      charts: {
        teacherDistribution: mockZones.map((z) => ({
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
      systemHealth: [
        { label: "Database", value: 98, status: "healthy" },
        { label: "Sync Engine", value: 95, status: "healthy" },
        { label: "API Response", value: 87, status: "warning" },
        { label: "Storage", value: 72, status: "healthy" },
      ],
      lastUpdated: new Date(),
    };
  }

  /**
   * Set up WebSocket connection for real-time updates (Web)
   * Uses the reusable WebSocket client from @/lib/websocket
   */
  private setupWebSocket() {
    const env = useRuntimeConfig();
    const wsUrl = env.public.wsUrl;

    if (!wsUrl) {
      console.log("WebSocket URL not configured, skipping real-time updates");
      return;
    }

    // Get JWT token for authentication
    const user = useUser();
    if (!user.value?.token) {
      console.log("No auth token available, skipping WebSocket connection");
      return;
    }

    try {
      // Use the WebSocket client library with auth token
      this.wsConnection = useWebSocketClient({
        url: wsUrl,
        token: user.value?.token,
        autoConnect: true,
        autoReconnect: true,
        maxRetries: -1,
        reconnectDelay: 2000,
        maxReconnectDelay: 30000,
        heartbeat: true,
        heartbeatInterval: 30000,
        onConnected: () => {
          console.log("Dashboard WebSocket connected (authenticated)");
          // Subscribe to dashboard updates channel
          this.wsConnection?.subscribe("dashboard");
        },
        onDisconnected: () => {
          console.log("Dashboard WebSocket disconnected");
        },
        onError: (_, event) => {
          console.error("Dashboard WebSocket error:", event);
        },
      });

      // Listen for dashboard update messages
      this.wsUnsubscribe = this.wsConnection.on(
        "dashboard_update",
        (data: Partial<DashboardData>) => {
          this.handleWebSocketUpdate(data);
        },
      );
    } catch (err) {
      console.error("Failed to setup WebSocket:", err);
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
    if (this.wsConnection) {
      this.wsConnection.disconnect();
    }
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

    // Computed
    topZones,
    criticalAlertsCount,

    // State
    isLoading,
    error,

    // Actions
    refresh,
    dismissAlert,

    // Environment
    isElectron: isElectron(),
  };
}
