import axios from "axios";
import { dbManager } from "../app.db.js";
import { storeHelper } from "../../store/store.js";
import { networkService } from "./NetworkService.js";
import log from "../../utils/logger.js";

export class PullService {
  public isPulling: boolean = false;

  public async pullUpdates(lastSynced: Date): Promise<void> {
    if (this.isPulling) return;
    this.isPulling = true;
    try {
      const token = storeHelper.getSession()?.token;
      const nitroPort = networkService.getNitroPort();
      if (!nitroPort) {
        log.warn("Sync pull skipped: No nitroPort found");
        return;
      }

      const tablesToPull = ["scanned_records", "staff", "staff_logs"];

      for (const table of tablesToPull) {
        try {
          const response = await axios.post(`http://localhost:${nitroPort}/api/sync/pull`, {
            tableName: table,
            lastSyncTime: lastSynced.toISOString(),
            token
          }, { timeout: 15000 });

          if (response.data?.success && response.data.records) {
            const records = response.data.records;
            if (records.length > 0) {
              log.info(`Pulled ${records.length} updates for ${table}`);
              for (const record of records) {
                // Idempotent and conflict-safe inserts
                const existing = await dbManager.findOne(table, { _id: record._id });
                if (existing) {
                   await dbManager.update(table, { _id: record._id }, { $set: record }, { multi: false }, true);
                } else {
                   await dbManager.insert(table, record, true); // true for incoming
                }
              }
            }
          }
        } catch (err) {
          log.error(`Failed to pull updates for table ${table}`, err);
        }
      }
    } finally {
      this.isPulling = false;
    }
  }
}

export const pullService = new PullService();
