import { BrowserWindow } from "electron";
import { dbManager } from "./app.db.js";
import axios from "axios";
import log from "../utils/logger.js";
import { NotificationService } from "../utils/notification.js";
import { storeHelper } from "../store/store.js";
import fs from "node:fs";

export interface SyncStatusUpdate {
  isOnline: boolean;
  lastSynced: Date;
  pendingChanges: number;
  unsyncedSizeMb: number;
  requiresIntervention: boolean;
}

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private statusInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private lastSynced: Date;
  private isOnline: boolean = false;
  private pendingChanges: number = 0;
  private unsyncedSizeMb: number = 0;
  private canNotify: boolean = false;

  constructor() {
    const storedLastSync = storeHelper.getLastSync();
    this.lastSynced = storedLastSync ? new Date(storedLastSync) : new Date();
  }

  private async checkConnection(): Promise<boolean> {
    const nitroPort = storeHelper.get("nitroPort");
    
    // If nitroPort is not yet assigned, we can't connect to the local proxy
    if (!nitroPort) return false;

    try {
      // 1. Check local Nitro gateway
      await axios.head(`http://localhost:${nitroPort}/api/health`, { timeout: 3000 });
      
      // 2. Check cloud API
      await axios.head("https://api.axiolot.com.ng/health", { timeout: 5000 });
      return true;
    } catch {
      try {
        await axios.head("https://api.axiolot.com.ng", { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  private async calculatePending(): Promise<{ count: number; sizeMb: number }> {
    try {
      const queueItems = await dbManager.find<any>("sync_queue", { synced: false });
      let sizeBytes = 0;

      for (const item of queueItems) {
        if (item.payload) {
          // Look for file paths in payload and sum their sizes
          const checkPayloadForFiles = (obj: any) => {
            for (const key in obj) {
              const val = obj[key];
              if (typeof val === 'string' && (val.endsWith('.pdf') || val.endsWith('.jpg') || val.endsWith('.png'))) {
                try {
                  if (fs.existsSync(val)) {
                    sizeBytes += fs.statSync(val).size;
                  }
                } catch (e) {
                  // ignore
                }
              } else if (typeof val === 'object' && val !== null) {
                checkPayloadForFiles(val);
              }
            }
          };
          checkPayloadForFiles(item.payload);
        }
      }

      return {
        count: queueItems.length,
        sizeMb: sizeBytes / (1024 * 1024)
      };
    } catch (error) {
      log.error("Failed to calculate pending sync size", error);
      return { count: 0, sizeMb: 0 };
    }
  }

  private broadcastStatus() {
    const status: SyncStatusUpdate = {
      isOnline: this.isOnline,
      lastSynced: this.lastSynced,
      pendingChanges: this.pendingChanges,
      unsyncedSizeMb: this.unsyncedSizeMb,
      requiresIntervention: this.unsyncedSizeMb >= 1000 // 1GB threshold
    };

    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("sync-status-update", status);
      }
    });

    // Also push metrics to Nitro
    this.pushMetricsToNitro(status);
  }

  private async pushMetricsToNitro(status: SyncStatusUpdate) {
    const nitroPort = storeHelper.get("nitroPort");
    if (!nitroPort) return;
    
    try {
      await axios.post(`http://localhost:${nitroPort}/api/sync/metrics`, {
        unsynced_count: status.pendingChanges,
        unsynced_size_mb: status.unsyncedSizeMb,
        last_sync: status.lastSynced.getTime()
      }, { timeout: 3000 });
    } catch (error) {
      log.debug("Failed to push metrics to Nitro", error);
    }
  }

  private async updateStatus() {
    this.isOnline = await this.checkConnection();
    const pending = await this.calculatePending();
    this.pendingChanges = pending.count;
    this.unsyncedSizeMb = pending.sizeMb;
    this.broadcastStatus();
  }

  public start(intervalMs: number = 5 * 60 * 1000) {
    if (!storeHelper.isUserLoggedIn()) {
      log.info("Sync not started: No user is currently logged in");
      return;
    }

    log.debug("Starting sync service", {
      user: storeHelper.getUser()?.uuid,
      isLoggedIn: storeHelper.isUserLoggedIn(),
    });

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    this.updateStatus();

    this.syncInterval = setInterval(() => {
      this.syncAllTables();
    }, intervalMs);

    this.statusInterval = setInterval(() => {
      this.updateStatus();
    }, 30000);

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

  public async syncAllTables() {
    if (!storeHelper.isUserLoggedIn()) {
      log.info("Sync skipped: No user is currently logged in");
      if (this.canNotify) {
        NotificationService.show(
          "Synchronization Failed",
          "You are not logged in. Please log in to sync your data.",
        );
      }
      this.canNotify = false;
      return;
    }

    if (this.isSyncing) return;
    this.isSyncing = true;

    await this.updateStatus();

    if (!this.isOnline) {
      log.info("Sync skipped: No connection to Nitro server");
      this.isSyncing = false;
      return;
    }

    try {
      await this.pushPendingChanges();
      await this.pullUpdates();

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

  private async pushPendingChanges() {
    const queueItems = await dbManager.find<any>("sync_queue", { synced: false });
    if (queueItems.length === 0) return;

    const token = storeHelper.getSession()?.token;
    const nitroPort = storeHelper.get("nitroPort");
    if (!nitroPort) {
      log.warn("Sync push skipped: No nitroPort found");
      return;
    }

    // Batching items (100 per batch)
    const batchSize = 100;
    for (let i = 0; i < queueItems.length; i += batchSize) {
      const batch = queueItems.slice(i, i + batchSize);
      
      try {
        const response = await axios.post(`http://localhost:${nitroPort}/api/sync/push`, {
          records: batch,
          token
        });

        if (response.data?.success) {
          // Process successful batch
          const updatedRecords = response.data.updatedRecords || [];
          const processedFiles = response.data.processedFiles || [];

          // Clean up files locally
          for (const file of processedFiles) {
            try {
              if (fs.existsSync(file)) {
                fs.unlinkSync(file);
              }
            } catch (err) {
              log.warn("Failed to delete synced file", file);
            }
          }

          // Update local records with updated payloads (e.g., file URLs)
          for (const updatedRecord of updatedRecords) {
             const table = updatedRecord.table;
             const recordId = updatedRecord.record_id;
             if (table && recordId && updatedRecord.payload) {
               await dbManager.update(table, { _id: recordId }, { $set: updatedRecord.payload }, { multi: false }, true);
             }
          }

          // Mark queue items as synced
          for (const item of batch) {
            await dbManager.update("sync_queue", { _id: item._id }, { $set: { synced: true } }, { multi: false }, true);
          }
        } else {
           log.error("Sync push batch failed", response.data);
        }
      } catch (err) {
        log.error("Failed to push batch to Nitro", err);
      }
    }
  }

  private async pullUpdates() {
    const token = storeHelper.getSession()?.token;
    const nitroPort = storeHelper.get("nitroPort");
    if (!nitroPort) {
      log.warn("Sync pull skipped: No nitroPort found");
      return;
    }

    // We can pull multiple tables
    const tablesToPull = ["scanned_records", "staff", "staff_logs"];

    for (const table of tablesToPull) {
      try {
        const response = await axios.post(`http://localhost:${nitroPort}/api/sync/pull`, {
          tableName: table,
          lastSyncTime: this.lastSynced.toISOString(),
          token
        });

        if (response.data?.success && response.data.records) {
          const records = response.data.records;
          if (records.length > 0) {
            log.info(`Pulled ${records.length} updates for ${table}`);
            for (const record of records) {
              // Update local DB, passing true for isIncoming to avoid triggering sync_queue
              await dbManager.insert(table, record, true);
            }
          }
        }
      } catch (err) {
        log.error(`Failed to pull updates for table ${table}`, err);
      }
    }
  }

  public async syncNow({ canNotify = false }: { canNotify?: boolean } = {}) {
    this.canNotify = canNotify;
    await this.syncAllTables();
  }

  public async notifyDataChange() {
    await this.updateStatus();
  }

  public getStatus(): SyncStatusUpdate {
    return {
      isOnline: this.isOnline,
      lastSynced: this.lastSynced,
      pendingChanges: this.pendingChanges,
      unsyncedSizeMb: this.unsyncedSizeMb,
      requiresIntervention: this.unsyncedSizeMb >= 1000
    };
  }
}

export const syncService = new SyncService();
