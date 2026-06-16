import { ref, computed, readonly } from "vue";
import { useRoute } from "#imports";
import { syncQueue, isElectron } from "@/lib/db";
import type { SyncStatus } from "@/types";

const FORBIDDEN_ROUTES = ["/", "/login", "/pin"];

class SyncStatusManager {
  private status = ref<SyncStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : false,
    lastSynced: new Date(),
    pendingChanges: 0,
    unsyncedSizeMb: 0,
    requiresIntervention: false,
    isChecking: false,
    connectionStrength: "offline",
  });

  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribeElectron: (() => void) | null = null;
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private async init() {
    const route = useRoute();
    if (this.isInitialized || FORBIDDEN_ROUTES.includes(route.path)) return;
    this.isInitialized = true;

    if (isElectron()) {
      this.setupElectronListeners();
    } else {
      await this.setupWebListeners();
    }
  }

  private setupElectronListeners() {
    this.setupActivityTracking();
    if (window.electronAPI.onSyncStatusUpdate) {
      this.unsubscribeElectron = window.electronAPI.onSyncStatusUpdate(
        (status) => {
          this.status.value = {
            ...this.status.value,
            isOnline: status.isOnline,
            lastSynced: new Date(status.lastSynced),
            pendingChanges: status.pendingChanges,
            isIdle: status.isIdle,
            isPushing: status.isPushing,
            isPulling: status.isPulling,
            unsyncedSizeMb: status.unsyncedSizeMb,
            requiresIntervention: status.requiresIntervention,
            connectionStrength: status.isOnline ? "excellent" : "offline",
          };
          this.notifyListeners();
        },
      );
    }
    this.startConnectionCheck();
  }

  private async setupWebListeners() {
    this.status.value.lastSynced = new Date();

    this.setupActivityTracking();

    window.addEventListener("online", this.handleOnlineChange);
    window.addEventListener("offline", this.handleOnlineChange);

    await this.updatePendingChanges();

    this.startConnectionCheck();
  }

  private handleOnlineChange = async () => {
    await this.checkServerConnection();
  };

  private activityTimeout: ReturnType<typeof setTimeout> | null = null;

  private setupActivityTracking() {
    const reportActivity = () => {
      if (this.activityTimeout) return;
      
      if (isElectron() && window.electronAPI.reportActivity) {
        window.electronAPI.reportActivity();
      }

      // Throttle activity reporting to once every 5 seconds
      this.activityTimeout = setTimeout(() => {
        this.activityTimeout = null;
      }, 5000);
    };

    window.addEventListener('mousemove', reportActivity, { passive: true });
    window.addEventListener('keydown', reportActivity, { passive: true });
    window.addEventListener('focus', reportActivity, { passive: true });
    window.addEventListener('click', reportActivity, { passive: true });
  }

  /**
   * Update pending changes count from the database
   */
  private async updatePendingChanges(): Promise<void> {
    try {
      const count = await syncQueue.getPendingCount();
      this.status.value.pendingChanges = count;
      this.notifyListeners();
    } catch (error) {
      console.error("Failed to get pending changes count:", error);
    }
  }

  /**
   * Add a pending change to the sync queue
   */
  public async addPendingChange(
    data: Record<string, unknown>,
    type: "insert" | "update" | "delete" = "insert",
  ): Promise<void> {
    await syncQueue.add(data, type);
    await this.updatePendingChanges();
  }

  /**
   * Clear all pending changes (after successful sync)
   */
  public async clearPendingChanges(): Promise<void> {
    await syncQueue.clearAll();
    this.status.value.pendingChanges = 0;
    this.notifyListeners();
  }

  /**
   * Mark specific changes as synced
   */
  public async markSynced(ids: string[]): Promise<void> {
    for (const id of ids) {
      await syncQueue.markSynced(id);
    }
    await this.updatePendingChanges();
  }

  private startConnectionCheck() {
    this.checkServerConnection();

    this.checkInterval = setInterval(() => {
      this.checkServerConnection();
    }, 30000);
  }

  private async checkServerConnection(): Promise<void> {
    const env = useRuntimeConfig();
    const API_URL = env.public.apiUrl;
    this.status.value.isChecking = true;

    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_URL}/health`, {
        method: "HEAD",
        cache: "no-cache",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (response.ok) {
        this.status.value.isOnline = true;
        this.status.value.connectionStrength =
          this.getConnectionStrength(latency);

        if (!isElectron()) {
          this.status.value.lastSynced = new Date();
        }
      } else {
        this.status.value.isOnline = false;
        this.status.value.connectionStrength = "offline";
      }
    } catch {
      const isOnline =
        typeof navigator !== "undefined" ? navigator.onLine : false;
      this.status.value.isOnline = isOnline;
      this.status.value.connectionStrength = isOnline ? "poor" : "offline";
    } finally {
      this.status.value.isChecking = false;
      this.notifyListeners();
    }
  }

  private getConnectionStrength(
    latency: number,
  ): "excellent" | "good" | "poor" {
    if (latency < 100) return "excellent";
    if (latency < 500) return "good";
    return "poor";
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getStatus(): SyncStatus {
    return this.status.value;
  }

  public getStatusRef() {
    return readonly(this.status);
  }

  public async forceCheck(): Promise<void> {
    await this.checkServerConnection();
    await this.updatePendingChanges();
  }

  public cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    if (this.unsubscribeElectron) {
      this.unsubscribeElectron();
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnlineChange);
      window.removeEventListener("offline", this.handleOnlineChange);
    }
  }
}

let syncManager: SyncStatusManager | null = null;

function getSyncManager(): SyncStatusManager {
  if (!syncManager) {
    syncManager = new SyncStatusManager();
  }
  return syncManager;
}

export function useSyncStatus() {
  const manager = getSyncManager();
  const status = manager.getStatusRef();
  const cleanup = () => manager.cleanup();

  const formatLastSynced = computed(() => {
    const diff = Date.now() - status.value.lastSynced.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    return status.value.lastSynced.toLocaleDateString();
  });

  const statusLabel = computed(() => {
    if (status.value.isChecking) return "Checking...";
    if (!status.value.isOnline) return "Offline Mode";

    switch (status.value.connectionStrength) {
      case "excellent":
        return "Connected";
      case "good":
        return "Connected";
      case "poor":
        return "Weak Connection";
      default:
        return "Offline Mode";
    }
  });

  const statusColor = computed(() => {
    if (!status.value.isOnline) {
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-600 dark:text-amber-400",
        dot: "bg-amber-500",
      };
    }

    switch (status.value.connectionStrength) {
      case "excellent":
        return {
          bg: "bg-emerald-500/10",
          text: "text-emerald-600 dark:text-emerald-400",
          dot: "bg-emerald-500",
        };
      case "good":
        return {
          bg: "bg-emerald-500/10",
          text: "text-emerald-600 dark:text-emerald-400",
          dot: "bg-emerald-500",
        };
      case "poor":
        return {
          bg: "bg-yellow-500/10",
          text: "text-yellow-600 dark:text-yellow-400",
          dot: "bg-yellow-500",
        };
      default:
        return {
          bg: "bg-amber-500/10",
          text: "text-amber-600 dark:text-amber-400",
          dot: "bg-amber-500",
        };
    }
  });

  const forceCheck = () => manager.forceCheck();

  const addPendingChange = (
    data: Record<string, unknown>,
    type?: "insert" | "update" | "delete",
  ) => manager.addPendingChange(data, type);

  const clearPendingChanges = () => manager.clearPendingChanges();

  const markSynced = (ids: string[]) => manager.markSynced(ids);

  return {
    status,
    formatLastSynced,
    statusLabel,
    statusColor,
    forceCheck,
    addPendingChange,
    clearPendingChanges,
    markSynced,
    isElectron: isElectron(),
    cleanup,
  };
}
