import { ref, readonly, watch, type Ref } from "vue";
import { useChannel, useSendMessage } from "@/composables/useWebSocket";
import { db, isElectron, STORES, type DBRecord } from "@/lib/db";

/* =======================
   Types
======================= */
export interface DepartmentTaskData {
  id: string;
  month: string;
  year: string;
  departmentName: string;
  totalAssigned: number;
  totalCompleted: number;
  completionPercentage: number;
  performanceStatus: "Failure" | "Good" | "Fair" | "Excellent";
  remark: string;
}

interface TaskReportRecord extends DBRecord, DepartmentTaskData {}

interface WSTaskReportPayload {
  action: "upsert" | "delete" | "sync";
  data?: DepartmentTaskData | DepartmentTaskData[];
  month?: string;
  year?: string;
  id?: string;
}

/* =======================
   Performance Logic
======================= */
const PERFORMANCE_REMARKS: Record<
  DepartmentTaskData["performanceStatus"],
  string
> = {
  Failure: "Department performance is below expectation.",
  Good: "Department shows moderate task completion.",
  Fair: "Department performance is satisfactory.",
  Excellent: "Outstanding departmental performance.",
};

export function getPerformanceStatus(
  pct: number,
): DepartmentTaskData["performanceStatus"] {
  if (pct >= 100) return "Excellent";
  if (pct >= 75) return "Fair";
  if (pct >= 50) return "Good";
  return "Failure";
}

export function getRemark(
  status: DepartmentTaskData["performanceStatus"],
): string {
  return PERFORMANCE_REMARKS[status];
}

export function computeDepartmentMetrics(
  departmentName: string,
  totalAssigned: number,
  totalCompleted: number,
  month: string,
  year: string,
  existingId?: string,
): DepartmentTaskData {
  const capped = Math.min(totalCompleted, totalAssigned);
  const pct =
    totalAssigned > 0 ? Math.round((capped / totalAssigned) * 100) : 0;
  const status = getPerformanceStatus(pct);

  return {
    id: existingId || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    month,
    year,
    departmentName: departmentName.trim(),
    totalAssigned,
    totalCompleted: capped,
    completionPercentage: pct,
    performanceStatus: status,
    remark: getRemark(status),
  };
}

/* =======================
   Task Report Manager
======================= */
class TaskReportManager {
  private dataByPeriod = ref<Map<string, DepartmentTaskData[]>>(new Map());
  private currentMonth = ref("");
  private currentYear = ref("");
  private isLoading = ref(false);
  private isSaving = ref(false);
  private error = ref<string | null>(null);

  private wsChannel = useChannel("task_reports");
  private wsSender = useSendMessage();
  private wsUnsubscribe: (() => void) | null = null;

  constructor() {
    this.setupWebSocket();
  }

  /* =======================
     Period Key helper
  ======================= */
  private periodKey(month: string, year: string): string {
    return `${year}_${month}`;
  }

  /* =======================
     WebSocket
  ======================= */
  private setupWebSocket() {
    // Listen for server-pushed updates
    this.wsUnsubscribe = this.wsChannel.on(
      "task_report_update",
      async (incoming: WSTaskReportPayload) => {
        try {
          switch (incoming.action) {
            case "upsert": {
              const items = Array.isArray(incoming.data)
                ? incoming.data
                : incoming.data
                  ? [incoming.data]
                  : [];
              for (const item of items) {
                this.applyUpsert(item);
                await this.saveToLocalDB(item);
              }
              break;
            }
            case "delete": {
              if (incoming.id) {
                this.applyDelete(incoming.id);
                await this.deleteFromLocalDB(incoming.id);
              }
              break;
            }
            case "sync": {
              // Full sync: replace all data for the given month/year
              const items = Array.isArray(incoming.data)
                ? incoming.data
                : incoming.data
                  ? [incoming.data]
                  : [];
              if (incoming.month && incoming.year) {
                const key = this.periodKey(incoming.month, incoming.year);
                this.dataByPeriod.value.set(key, items);
                // Persist all to local
                for (const item of items) {
                  await this.saveToLocalDB(item);
                }
              }
              break;
            }
          }
        } catch (err) {
          console.error("WS task report update error:", err);
        }
      },
    );
  }

  /* =======================
     In-memory operations
  ======================= */
  private applyUpsert(data: DepartmentTaskData) {
    const key = this.periodKey(data.month, data.year);
    const list = this.dataByPeriod.value.get(key) || [];

    const idx = list.findIndex((d) => d.id === data.id);
    if (idx > -1) {
      list[idx] = data;
    } else {
      list.push(data);
    }

    this.dataByPeriod.value.set(key, [...list]);
  }

  private applyDelete(id: string) {
    for (const [key, list] of this.dataByPeriod.value.entries()) {
      const idx = list.findIndex((d) => d.id === id);
      if (idx > -1) {
        list.splice(idx, 1);
        this.dataByPeriod.value.set(key, [...list]);
        break;
      }
    }
  }

  /* =======================
     Local DB Operations
  ======================= */
  private async saveToLocalDB(data: DepartmentTaskData) {
    try {
      const existing = await db.findOne<TaskReportRecord>(
        STORES.TASK_REPORTS,
        { id: data.id } as any,
      );
      if (existing) {
        await db.update<TaskReportRecord>(
          STORES.TASK_REPORTS,
          { id: data.id } as any,
          { $set: { ...data, updatedAt: new Date() } as any },
        );
      } else {
        await db.insert<TaskReportRecord>(STORES.TASK_REPORTS, {
          ...data,
          _id: data.id,
        } as TaskReportRecord);
      }
    } catch (err) {
      console.error("Local DB save failed:", err);
    }
  }

  private async deleteFromLocalDB(id: string) {
    try {
      await db.delete(STORES.TASK_REPORTS, { id } as any);
    } catch (err) {
      console.error("Local DB delete failed:", err);
    }
  }

  private async loadFromLocalDB(
    month: string,
    year: string,
  ): Promise<DepartmentTaskData[]> {
    try {
      const records = await db.find<TaskReportRecord>(
        STORES.TASK_REPORTS,
        { month, year } as any,
      );
      return records.map((r) => ({
        id: r.id,
        month: r.month,
        year: r.year,
        departmentName: r.departmentName,
        totalAssigned: r.totalAssigned,
        totalCompleted: r.totalCompleted,
        completionPercentage: r.completionPercentage,
        performanceStatus: r.performanceStatus,
        remark: r.remark,
      }));
    } catch (err) {
      console.warn("Local DB load failed:", err);
      return [];
    }
  }

  /* =======================
     Send to server via WS
  ======================= */
  private sendToServer(payload: WSTaskReportPayload) {
    this.wsSender.send("task_report_update", payload, "task_reports");
  }

  /* =======================
     Public API
  ======================= */

  /**
   * Load report data for a given month/year.
   * Loads from local DB first, then requests fresh data from server.
   */
  public async loadPeriod(month: string, year: string) {
    this.currentMonth.value = month;
    this.currentYear.value = year;
    this.isLoading.value = true;
    this.error.value = null;

    const key = this.periodKey(month, year);

    try {
      // 1. Load from local DB first (instant data)
      const localData = await this.loadFromLocalDB(month, year);
      if (localData.length > 0) {
        this.dataByPeriod.value.set(key, localData);
      }

      // 2. Request fresh data from server via WebSocket
      this.sendToServer({
        action: "sync",
        month,
        year,
      });
    } catch (err) {
      console.error("Failed to load period:", err);
      this.error.value = "Failed to load report data";
    } finally {
      this.isLoading.value = false;
    }
  }

  /**
   * Add or update a department entry.
   * Saves locally, updates state, and sends to server immediately.
   */
  public async upsertDepartment(data: DepartmentTaskData) {
    this.isSaving.value = true;

    try {
      // 1. Update in-memory state
      this.applyUpsert(data);

      // 2. Save to local DB
      await this.saveToLocalDB(data);

      // 3. Send to server via WebSocket
      this.sendToServer({
        action: "upsert",
        data,
      });
    } catch (err) {
      console.error("Failed to save department:", err);
      this.error.value = "Failed to save entry";
    } finally {
      this.isSaving.value = false;
    }
  }

  /**
   * Remove a department entry.
   * Removes locally, updates state, and sends to server immediately.
   */
  public async deleteDepartment(id: string) {
    try {
      // 1. Update in-memory state
      this.applyDelete(id);

      // 2. Remove from local DB
      await this.deleteFromLocalDB(id);

      // 3. Send delete to server
      this.sendToServer({
        action: "delete",
        id,
      });
    } catch (err) {
      console.error("Failed to delete department:", err);
      this.error.value = "Failed to delete entry";
    }
  }

  /**
   * Get data for a specific period (reactive)
   */
  public getDataForPeriod(month: string, year: string): DepartmentTaskData[] {
    const key = this.periodKey(month, year);
    return this.dataByPeriod.value.get(key) || [];
  }

  public getState() {
    return {
      dataByPeriod: readonly(this.dataByPeriod),
      currentMonth: readonly(this.currentMonth),
      currentYear: readonly(this.currentYear),
      isLoading: readonly(this.isLoading),
      isSaving: readonly(this.isSaving),
      error: readonly(this.error),
    };
  }

  public cleanup() {
    if (this.wsUnsubscribe) this.wsUnsubscribe();
  }
}

/* =======================
   Singleton + Composable
======================= */
let manager: TaskReportManager | null = null;

function getManager(): TaskReportManager {
  if (!manager) {
    manager = new TaskReportManager();
  }
  return manager;
}

export function useTaskReportData() {
  const mgr = getManager();
  const state = mgr.getState();

  return {
    // State
    dataByPeriod: state.dataByPeriod,
    currentMonth: state.currentMonth,
    currentYear: state.currentYear,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    error: state.error,

    // Actions
    loadPeriod: (month: string, year: string) => mgr.loadPeriod(month, year),
    upsertDepartment: (data: DepartmentTaskData) =>
      mgr.upsertDepartment(data),
    deleteDepartment: (id: string) => mgr.deleteDepartment(id),
    getDataForPeriod: (month: string, year: string) =>
      mgr.getDataForPeriod(month, year),
    cleanup: () => mgr.cleanup(),
  };
}
