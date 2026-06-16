import { BrowserWindow } from "electron";
import { dbManager } from "./app.db.js";
import log from "../utils/logger.js";
import { NotificationService } from "../utils/notification.js";
import { storeHelper } from "../store/store.js";
import fs from "node:fs";
import { idleService } from "./sync/IdleService.js";
import { networkService } from "./sync/NetworkService.js";
import { pushService } from "./sync/PushService.js";
import { pullService } from "./sync/PullService.js";

export interface SyncStatusUpdate {
  isOnline: boolean;
  isIdle: boolean;
  isPushing: boolean;
  isPulling: boolean;
  lastSynced: Date;
  pendingChanges: number;
  unsyncedSizeMb: number;
  requiresIntervention: boolean;
}

class SyncService {
  private pullInterval: NodeJS.Timeout | null = null;
  private pushTimeout: NodeJS.Timeout | null = null;
  private statusInterval: NodeJS.Timeout | null = null;
  private statusDebounceTimer: NodeJS.Timeout | null = null;

  private lastSynced: Date;
  private isOnline: boolean = false;
  private pendingChanges: number = 0;
  private unsyncedSizeMb: number = 0;
  private canNotify: boolean = false;

  private readonly PULL_INTERVAL_MS = 60 * 1000; // Every 60s
  private readonly BASE_PUSH_INTERVAL_MS = 15 * 1000; // Every 15s

  constructor() {
    const storedLastSync = storeHelper.getLastSync();
    this.lastSynced = storedLastSync ? new Date(storedLastSync) : new Date();
  }

  public reportUserActivity(): void {
    idleService.updateActivity();
    this.scheduleStatusBroadcast();
  }

  private async calculatePending(): Promise<{ count: number; sizeMb: number }> {
    try {
      const queueItems = await dbManager.find<any>("sync_queue", { synced: false });
      let sizeBytes = 0;

      for (const item of queueItems) {
        if (item.payload) {
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

  private scheduleStatusBroadcast() {
    if (this.statusDebounceTimer) {
      clearTimeout(this.statusDebounceTimer);
    }
    this.statusDebounceTimer = setTimeout(() => {
      this.broadcastStatus();
    }, 500);
  }

  private broadcastStatus() {
    const status: SyncStatusUpdate = {
      isOnline: this.isOnline,
      isIdle: idleService.isIdle(),
      isPushing: pushService.isPushing,
      isPulling: pullService.isPulling,
      lastSynced: this.lastSynced,
      pendingChanges: this.pendingChanges,
      unsyncedSizeMb: this.unsyncedSizeMb,
      requiresIntervention: this.unsyncedSizeMb >= 1000
    };

    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("sync-status-update", status);
      }
    });
  }

  private async updateStatus() {
    this.isOnline = await networkService.checkConnection();
    const pending = await this.calculatePending();
    this.pendingChanges = pending.count;
    this.unsyncedSizeMb = pending.sizeMb;
    this.scheduleStatusBroadcast();
  }

  public start() {
    if (!storeHelper.isUserLoggedIn()) {
      log.info("Sync not started: No user is currently logged in");
      return;
    }

    log.debug("Starting sync service", {
      user: storeHelper.getUser()?.uuid,
      isLoggedIn: storeHelper.isUserLoggedIn(),
    });

    this.stop(); // Clear any existing intervals

    this.updateStatus();

    this.pullInterval = setInterval(() => {
      this.pullRoutine();
    }, this.PULL_INTERVAL_MS);

    this.scheduleNextPush();

    this.statusInterval = setInterval(() => {
      this.updateStatus();
    }, 30000);

    // Initial sync
    this.pullRoutine();
    this.pushRoutine();
  }

  public stop() {
    if (this.pullInterval) clearInterval(this.pullInterval);
    if (this.pushTimeout) clearTimeout(this.pushTimeout);
    if (this.statusInterval) clearInterval(this.statusInterval);
    if (this.statusDebounceTimer) clearTimeout(this.statusDebounceTimer);
    
    this.pullInterval = null;
    this.pushTimeout = null;
    this.statusInterval = null;
    this.statusDebounceTimer = null;
    log.info("Sync service stopped");
  }

  private async pullRoutine() {
    if (!this.isOnline || pullService.isPulling) return;
    
    await pullService.pullUpdates(this.lastSynced);
    
    this.lastSynced = new Date();
    storeHelper.updateLastSync();
    this.scheduleStatusBroadcast();
  }

  private scheduleNextPush() {
    if (this.pushTimeout) clearTimeout(this.pushTimeout);
    
    // Adaptive frequency: if queue is large, push more frequently
    let nextInterval = this.BASE_PUSH_INTERVAL_MS;
    if (this.pendingChanges > 1000) {
      nextInterval = 5 * 1000; // Every 5s for huge queue
    } else if (this.pendingChanges > 100) {
      nextInterval = 10 * 1000; // Every 10s for medium queue
    }

    this.pushTimeout = setTimeout(() => {
      this.pushRoutine();
    }, nextInterval);
  }

  private async pushRoutine() {
    try {
      if (!this.isOnline || pushService.isPushing) return;
      if (!idleService.isIdle()) return;

      await pushService.pushPendingChanges();
      await this.updateStatus();
    } finally {
      this.scheduleNextPush();
    }
  }

  public async syncNow({ canNotify = false }: { canNotify?: boolean } = {}) {
    this.canNotify = canNotify;
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

    await this.updateStatus();

    if (!this.isOnline) {
      log.info("Sync skipped: No connection to server");
      return;
    }

    try {
      await pushService.pushPendingChanges();
      await pullService.pullUpdates(this.lastSynced);

      this.lastSynced = new Date();
      storeHelper.updateLastSync();
      log.info("Sync completed successfully");
    } catch (error) {
      log.error("Sync failed", error);
    } finally {
      await this.updateStatus();
    }
  }

  public async notifyDataChange() {
    await this.updateStatus();
    
    // Event-based trigger:
    // "When new item enters sync_queue, attempt push (only if idle)"
    if (idleService.isIdle() && !pushService.isPushing && this.isOnline) {
      log.info("Event-based push triggered by data change");
      this.pushRoutine();
    }
  }

  public getStatus(): SyncStatusUpdate {
    return {
      isOnline: this.isOnline,
      isIdle: idleService.isIdle(),
      isPushing: pushService.isPushing,
      isPulling: pullService.isPulling,
      lastSynced: this.lastSynced,
      pendingChanges: this.pendingChanges,
      unsyncedSizeMb: this.unsyncedSizeMb,
      requiresIntervention: this.unsyncedSizeMb >= 1000
    };
  }
}

export const syncService = new SyncService();
