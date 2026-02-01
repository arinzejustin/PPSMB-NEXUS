import { BrowserWindow } from "electron";
import { dbManager } from "./app.db.js";
import { getSupabase, rotateRecords } from "./supabase.js";
import axios from "axios";
import log from "../utils/logger.js";
import { NotificationService } from "../utils/notification.js";
import { storeHelper } from "../store/store.js";

export interface SyncStatusUpdate {
  isOnline: boolean;
  lastSynced: Date;
  pendingChanges: number;
}

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private statusInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private lastSynced: Date;
  private isOnline: boolean = false;
  private pendingChanges: number = 0;
  private canNotify: boolean = false;

  constructor() {
    // Load lastSynced from store, or use current date if not set
    const storedLastSync = storeHelper.getLastSync();
    this.lastSynced = storedLastSync ? new Date(storedLastSync) : new Date();
  }

  /**
   * Check if the sync server is reachable
   */
  private async checkConnection(): Promise<boolean> {
    try {
      await axios.head("https://ppsmb.com.ng/health", {
        timeout: 5000,
      });
      return true;
    } catch {
      try {
        await axios.head("https://ppsmb.com.ng", { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Count pending (unsynced) records across all tables
   */
  private async countPendingChanges(): Promise<number> {
    const tablesToSync = ["scanned_records", "staff_logs"];
    let total = 0;

    for (const table of tablesToSync) {
      try {
        const count = await dbManager.count(table, { synced: { $ne: true } });
        total += count;
      } catch (error) {
        log.warn(`Failed to count pending changes for table ${table}`, error);
      }
    }

    return total;
  }

  /**
   * Broadcast sync status to all renderer windows
   */
  private broadcastStatus() {
    const status: SyncStatusUpdate = {
      isOnline: this.isOnline,
      lastSynced: this.lastSynced,
      pendingChanges: this.pendingChanges,
    };

    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("sync-status-update", status);
      }
    });
  }

  /**
   * Update status and broadcast to frontend
   */
  private async updateStatus() {
    this.isOnline = await this.checkConnection();
    this.pendingChanges = await this.countPendingChanges();
    this.broadcastStatus();
  }

  /**
   * Start periodic sync
   * @param intervalMs Interval in milliseconds (default 5 minutes)
   */
  public start(intervalMs: number = 5 * 60 * 1000) {
    // Check if user is logged in before starting sync service
    if (!storeHelper.isUserLoggedIn()) {
      log.info("Sync not started: No user is currently logged in");

      return;
    }

    log.debug("Starting sync service", {
      user: storeHelper.getUser()?.uuid,
      isLoggedIn: storeHelper.isUserLoggedIn(),
    });

    // Clear existing intervals to prevent duplicates
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    // Initial status update
    this.updateStatus();

    // Sync and update status periodically
    this.syncInterval = setInterval(() => {
      this.syncAllTables();
    }, intervalMs);

    // Also update status more frequently (every 30 seconds)
    this.statusInterval = setInterval(() => {
      this.updateStatus();
    }, 30000);

    // Initial sync
    this.syncAllTables();
  }

  public stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    this.isSyncing = false;
    log.info("Sync service stopped");
  }

  /**
   * Sync all local tables that need syncing
   */
  public async syncAllTables() {
    // Check if user is logged in before syncing
    if (!storeHelper.isUserLoggedIn()) {
      log.info("Sync skipped: No user is currently logged in");
      if (this.canNotify)
        NotificationService.show(
          "Synchronization Failed",
          "You are not logged in. Please log in to sync your data.",
        );
      this.canNotify = false;
      return;
    }

    if (this.isSyncing) return;
    this.isSyncing = true;

    // Update status before sync
    await this.updateStatus();

    if (!this.isOnline) {
      log.info("Sync skipped: No internet connection");
      this.isSyncing = false;
      return;
    }

    try {
      const tablesToSync = ["scanned_records", "staff_logs"];

      for (const table of tablesToSync) {
        await this.syncTable(table);
        await rotateRecords(table, 3000);
      }

      this.lastSynced = new Date();
      storeHelper.updateLastSync();
      log.info("Sync completed successfully");
    } catch (error) {
      log.error("Sync failed", error);
    } finally {
      this.isSyncing = false;
      await this.updateStatus();
    }
  }

  /**
   * Sync a specific table
   */
  private async syncTable(tableName: string) {
    const supabase = getSupabase();

    // 1. Get unsynced records from local DB
    const unsyncedRecords = await dbManager.find<any>(tableName, {
      synced: { $ne: true },
    });

    if (unsyncedRecords.length === 0) return;

    log.info(
      `Syncing ${unsyncedRecords.length} records for table ${tableName}`,
    );

    for (const record of unsyncedRecords) {
      try {
        const { _id, synced, ...dataToSync } = record;

        // 2. Upsert to Supabase
        const { error } = await supabase.from(tableName).upsert(dataToSync);

        if (error) {
          log.error(`Failed to sync record ${record._id} to Supabase`, error);
          continue;
        }

        // 3. Mark as synced locally
        await dbManager.update(
          tableName,
          { _id: record._id },
          { $set: { synced: true } },
        );
      } catch (err) {
        log.error(`Error processing record ${record._id}`, err);
      }
    }
  }

  /**
   * Force an immediate sync
   */
  public async syncNow({ canNotify = false }: { canNotify?: boolean } = {}) {
    this.canNotify = canNotify;
    await this.syncAllTables();
  }

  /**
   * Notify that data has changed (called from IPC handlers)
   */
  public async notifyDataChange() {
    await this.updateStatus();
  }

  /**
   * Get current sync status
   */
  public getStatus(): SyncStatusUpdate {
    return {
      isOnline: this.isOnline,
      lastSynced: this.lastSynced,
      pendingChanges: this.pendingChanges,
    };
  }
}

export const syncService = new SyncService();
