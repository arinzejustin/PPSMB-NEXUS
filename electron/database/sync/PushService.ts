import axios from "axios";
import { dbManager } from "../app.db.js";
import { storeHelper } from "../../store/store.js";
import { networkService } from "./NetworkService.js";
import { idleService } from "./IdleService.js";
import log from "../../utils/logger.js";
import fs from "node:fs";

export class PushService {
  public isPushing: boolean = false;

  public async pushPendingChanges(): Promise<void> {
    if (this.isPushing) return;
    
    // We only push if idle, unless forced or we are trying to clear queue
    // The scheduler in SyncService checks for idle before calling this.
    
    this.isPushing = true;
    try {
      const queueCount = await dbManager.count("sync_queue", { synced: false });
      if (queueCount === 0) return;

      const token = storeHelper.getSession()?.token;
      const nitroPort = networkService.getNitroPort();
      if (!nitroPort) {
        log.warn("Sync push skipped: No nitroPort found");
        return;
      }

      const batchSize = 100;
      let offset = 0;

      // We process batches
      // Using a while loop and offsetting by 0 each time, because successful items 
      // are marked { synced: true }, so the offset 0 will fetch the next pending batch.
      while (offset < queueCount) {
        if (!idleService.isIdle()) {
          log.info("Push interrupted because user is no longer idle.");
          break;
        }

        const batch = await dbManager.find<any>(
          "sync_queue",
          { synced: false },
          { _id: 1 },
          batchSize,
          0
        );

        if (batch.length === 0) break;

        const maxRetries = 3;
        let retries = 0;
        let success = false;

        while (retries < maxRetries && !success) {
          try {
            const response = await axios.post(`http://localhost:${nitroPort}/api/sync/push`, {
              records: batch,
              token
            }, { timeout: 15000 });

            if (response.data?.success) {
              success = true;
              const updatedRecords = response.data.updatedRecords || [];
              const processedFiles = response.data.processedFiles || [];

              // Delete files after server confirmed success
              for (const file of processedFiles) {
                try {
                  await fs.promises.access(file, fs.constants.F_OK);
                  await fs.promises.unlink(file);
                } catch (err) {
                  // ignore if file doesn't exist
                }
              }

              for (const updatedRecord of updatedRecords) {
                const table = updatedRecord.table;
                const recordId = updatedRecord.record_id;
                if (table && recordId && updatedRecord.payload) {
                  await dbManager.update(table, { _id: recordId }, { $set: updatedRecord.payload }, { multi: false }, true);
                }
              }

              for (const item of batch) {
                await dbManager.update("sync_queue", { _id: item._id }, { $set: { synced: true } }, { multi: false }, true);
              }
            } else {
               log.error("Sync push batch failed", response.data);
               retries++;
               if (retries < maxRetries) {
                 await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
               }
            }
          } catch (err) {
            log.error("Failed to push batch to Nitro", err);
            retries++;
            if (retries < maxRetries) {
              await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
            }
          }
        }

        // Break if we exhausted retries to avoid infinite loops and retry later
        if (!success) {
           log.warn("Push batch failed after max retries. Halting push.");
           break;
        }
      }
    } finally {
      this.isPushing = false;
    }
  }
}

export const pushService = new PushService();
