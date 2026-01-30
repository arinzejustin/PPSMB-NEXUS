import { BrowserWindow } from "electron";
import { dbManager } from "./app.db.js";
import { getSupabase, rotateRecords } from "./supabase.js";
import axios from "axios";
import log from "../utils/logger.js";

export interface SyncStatusUpdate {
  isOnline: boolean;
  lastSynced: Date;
  pendingChanges: number;
}

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private lastSynced: Date = new Date();
  private isOnline: boolean = false;
  private pendingChanges: number = 0;

  /**
   * Check if internet is available by pinging the server
   */
  private async checkConnection(): Promise<boolean> {
    try {
      await axios.get("https://8.8.8.8", { timeout: 3000 });
      return true;
    } catch {
      try {
        await axios.head("https://www.google.com", { timeout: 3000 });
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
      } catch {
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
    if (this.syncInterval) clearInterval(this.syncInterval);

    // Initial status update
    this.updateStatus();

    // Sync and update status periodically
    this.syncInterval = setInterval(() => {
      this.syncAllTables();
    }, intervalMs);

    // Also update status more frequently (every 30 seconds)
    setInterval(() => {
      this.updateStatus();
    }, 30000);

    // Initial sync
    this.syncAllTables();
  }

  public stop() {
    if (this.syncInterval) clearInterval(this.syncInterval);
  }

  /**
   * Sync all local tables that need syncing
   */
  public async syncAllTables() {
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
      log.info("Sync completed successfully");
    } catch (error) {
      log.error("Sync failed", error);
    } finally {
      this.isSyncing = false;
      // Update status after sync
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
  public async syncNow() {
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
