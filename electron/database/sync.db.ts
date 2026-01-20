import { dbManager } from './app.db.js';
import { getSupabase, rotateRecords } from './supabase.js';
import axios from 'axios';
import log from '../utils/logger.js';

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;

  /**
   * Check if internet is available
   */
  private async checkConnection(): Promise<boolean> {
    try {
      // Simple ping to a reliable service
      await axios.get('https://8.8.8.8', { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start periodic sync
   * @param intervalMs Interval in milliseconds (default 5 minutes)
   */
  public start(intervalMs: number = 5 * 60 * 1000) {
    if (this.syncInterval) clearInterval(this.syncInterval);
    
    this.syncInterval = setInterval(() => this.syncAllTables(), intervalMs);
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

    const isConnected = await this.checkConnection();
    if (!isConnected) {
      log.info('Sync skipped: No internet connection');
      this.isSyncing = false;
      return;
    }

    try {
      // List of tables to sync. In a "pro" version, this could be dynamic or from config.
      // For now, let's assume 'scanned_records' is the main one.
      const tablesToSync = ['scanned_records', 'staff_logs']; 

      for (const table of tablesToSync) {
        await this.syncTable(table);
        await rotateRecords(table, 3000);
      }
      
      log.info('Sync completed successfully');
    } catch (error) {
      log.error('Sync failed', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a specific table
   */
  private async syncTable(tableName: string) {
    const supabase = getSupabase();
    
    // 1. Get unsynced records from local DB
    const unsyncedRecords = await dbManager.find<any>(tableName, { synced: { $ne: true } });

    if (unsyncedRecords.length === 0) return;

    log.info(`Syncing ${unsyncedRecords.length} records for table ${tableName}`);

    for (const record of unsyncedRecords) {
      try {
        const { _id, synced, ...dataToSync } = record;

        // 2. Upsert to Supabase
        const { error } = await supabase
          .from(tableName)
          .upsert(dataToSync);

        if (error) {
          log.error(`Failed to sync record ${record._id} to Supabase`, error);
          continue;
        }

        // 3. Mark as synced locally
        await dbManager.update(tableName, { _id: record._id }, { $set: { synced: true } });
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
}

export const syncService = new SyncService();
