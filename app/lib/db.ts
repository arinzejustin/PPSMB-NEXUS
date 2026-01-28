/**
 * Unified Database Abstraction Layer
 *
 * This module provides a unified API for data storage that works across both:
 * - Web: Uses IndexedDB for client-side storage
 * - Electron: Uses the Electron IPC bridge to talk to the local NeDB database
 *
 * It automatically detects the environment and routes operations accordingly.
 */

// Database configuration
const INDEXED_DB_NAME = "ppsmb_app_db";
const INDEXED_DB_VERSION = 1;

// Store names for IndexedDB
export const STORES = {
  SYNC_QUEUE: "sync_queue",
  PENDING_CHANGES: "pending_changes",
  CACHE: "cache",
  OFFLINE_DATA: "offline_data",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

export interface DBRecord {
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  synced?: boolean;
  [key: string]: unknown;
}

export interface QueryOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

/**
 * Check if running in Electron environment
 */
export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI;
}

/**
 * IndexedDB Manager for Web Environment
 */
class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: "_id",
              autoIncrement: true,
            });
            store.createIndex("createdAt", "createdAt", { unique: false });
            store.createIndex("synced", "synced", { unique: false });
          }
        });
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) {
      throw new Error("IndexedDB not initialized");
    }
    return this.db;
  }

  async insert<T extends DBRecord>(storeName: StoreName, doc: T): Promise<T> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);

      const record = {
        ...doc,
        _id: doc._id || this.generateId(),
        createdAt: doc.createdAt || new Date(),
        updatedAt: new Date(),
        synced: false,
      };

      const request = store.add(record);

      request.onsuccess = () => {
        resolve(record as T);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async find<T extends DBRecord>(
    storeName: StoreName,
    query?: Partial<T>,
    options?: QueryOptions,
  ): Promise<T[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as T[];

        // Apply query filter
        if (query && Object.keys(query).length > 0) {
          results = results.filter((record) => {
            return Object.entries(query).every(([key, value]) => {
              if (typeof value === "object" && value !== null) {
                // Handle special operators like $ne
                if ("$ne" in value) {
                  return record[key] !== (value as { $ne: unknown }).$ne;
                }
                if ("$gt" in value) {
                  return (
                    (record[key] as number) > (value as { $gt: number }).$gt
                  );
                }
                if ("$lt" in value) {
                  return (
                    (record[key] as number) < (value as { $lt: number }).$lt
                  );
                }
              }
              return record[key] === value;
            });
          });
        }

        // Apply sorting
        if (options?.sort) {
          const [sortKey, sortOrder] = Object.entries(options.sort)[0] || [];
          if (sortKey) {
            results.sort((a, b) => {
              const aVal = a[sortKey] as any;
              const bVal = b[sortKey] as any;
              if (aVal < bVal) return sortOrder === 1 ? -1 : 1;
              if (aVal > bVal) return sortOrder === 1 ? 1 : -1;
              return 0;
            });
          }
        }

        // Apply skip and limit
        if (options?.skip) {
          results = results.slice(options.skip);
        }
        if (options?.limit) {
          results = results.slice(0, options.limit);
        }

        resolve(results);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async findOne<T extends DBRecord>(
    storeName: StoreName,
    query: Partial<T>,
  ): Promise<T | null> {
    const results = await this.find<T>(storeName, query, { limit: 1 });
    return results[0] || null;
  }

  async update<T extends DBRecord>(
    storeName: StoreName,
    query: Partial<T>,
    update: Partial<T> | { $set: Partial<T> },
  ): Promise<number> {
    const db = await this.ensureDB();
    const records = await this.find<T>(storeName, query);

    if (records.length === 0) return 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      let updated = 0;

      const updateData = "$set" in update ? update.$set : update;

      records.forEach((record) => {
        const updatedRecord = {
          ...record,
          ...updateData,
          updatedAt: new Date(),
        };

        const request = store.put(updatedRecord);
        request.onsuccess = () => {
          updated++;
        };
      });

      transaction.oncomplete = () => {
        resolve(updated);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  async delete<T extends DBRecord>(
    storeName: StoreName,
    query: Partial<T>,
  ): Promise<number> {
    const db = await this.ensureDB();
    const records = await this.find<T>(storeName, query);

    if (records.length === 0) return 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      let deleted = 0;

      records.forEach((record) => {
        if (record._id) {
          const request = store.delete(record._id);
          request.onsuccess = () => {
            deleted++;
          };
        }
      });

      transaction.oncomplete = () => {
        resolve(deleted);
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  async count<T extends DBRecord>(
    storeName: StoreName,
    query?: Partial<T>,
  ): Promise<number> {
    const records = await this.find<T>(storeName, query);
    return records.length;
  }

  async clear(storeName: StoreName): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

/**
 * Electron DB Wrapper that uses IPC to communicate with main process
 */
class ElectronDBManager {
  async insert<T extends DBRecord>(tableName: string, doc: T): Promise<T> {
    const result = await window.electronAPI!.dbInsert(tableName, doc);
    return result as T;
  }

  async find<T extends DBRecord>(
    tableName: string,
    query?: Partial<T>,
    options?: QueryOptions,
  ): Promise<T[]> {
    return (await window.electronAPI!.dbFind(
      tableName,
      query || {},
      options?.sort,
      options?.limit,
      options?.skip,
    )) as T[];
  }

  async findOne<T extends DBRecord>(
    tableName: string,
    query: Partial<T>,
  ): Promise<T | null> {
    return (await window.electronAPI!.dbFindOne(tableName, query)) as T | null;
  }

  async update<T extends DBRecord>(
    tableName: string,
    query: Partial<T>,
    update: Partial<T> | { $set: Partial<T> },
    options?: { multi?: boolean },
  ): Promise<number> {
    return await window.electronAPI!.dbUpdate(
      tableName,
      query,
      update,
      options,
    );
  }

  async delete<T extends DBRecord>(
    tableName: string,
    query: Partial<T>,
    options?: { multi?: boolean },
  ): Promise<number> {
    return await window.electronAPI!.dbDelete(tableName, query, options);
  }

  async count<T extends DBRecord>(
    tableName: string,
    query?: Partial<T>,
  ): Promise<number> {
    return await window.electronAPI!.dbCount(tableName, query || {});
  }

  async syncRecords(): Promise<{ success: boolean; error?: string }> {
    return await window.electronAPI!.syncRecords();
  }
}

// Singleton instances
let indexedDBManager: IndexedDBManager | null = null;
let electronDBManager: ElectronDBManager | null = null;

function getIndexedDBManager(): IndexedDBManager {
  if (!indexedDBManager) {
    indexedDBManager = new IndexedDBManager();
  }
  return indexedDBManager;
}

function getElectronDBManager(): ElectronDBManager {
  if (!electronDBManager) {
    electronDBManager = new ElectronDBManager();
  }
  return electronDBManager;
}

/**
 * Unified Database API
 *
 * Automatically routes operations to either IndexedDB (web) or Electron storage (desktop)
 */
export const db = {
  /**
   * Insert a document into the database
   */
  async insert<T extends DBRecord>(tableName: string, doc: T): Promise<T> {
    if (isElectron()) {
      return getElectronDBManager().insert(tableName, doc);
    }
    return getIndexedDBManager().insert(tableName as StoreName, doc);
  },

  /**
   * Find documents matching a query
   */
  async find<T extends DBRecord>(
    tableName: string,
    query?: Partial<T>,
    options?: QueryOptions,
  ): Promise<T[]> {
    if (isElectron()) {
      return getElectronDBManager().find(tableName, query, options);
    }
    return getIndexedDBManager().find(tableName as StoreName, query, options);
  },

  /**
   * Find a single document matching a query
   */
  async findOne<T extends DBRecord>(
    tableName: string,
    query: Partial<T>,
  ): Promise<T | null> {
    if (isElectron()) {
      return getElectronDBManager().findOne(tableName, query);
    }
    return getIndexedDBManager().findOne(tableName as StoreName, query);
  },

  /**
   * Update documents matching a query
   */
  async update<T extends DBRecord>(
    tableName: string,
    query: Partial<T>,
    update: Partial<T> | { $set: Partial<T> },
    options?: { multi?: boolean },
  ): Promise<number> {
    if (isElectron()) {
      return getElectronDBManager().update(tableName, query, update, options);
    }
    return getIndexedDBManager().update(tableName as StoreName, query, update);
  },

  /**
   * Delete documents matching a query
   */
  async delete<T extends DBRecord>(
    tableName: string,
    query: Partial<T>,
    options?: { multi?: boolean },
  ): Promise<number> {
    if (isElectron()) {
      return getElectronDBManager().delete(tableName, query, options);
    }
    return getIndexedDBManager().delete(tableName as StoreName, query);
  },

  /**
   * Count documents matching a query
   */
  async count<T extends DBRecord>(
    tableName: string,
    query?: Partial<T>,
  ): Promise<number> {
    if (isElectron()) {
      return getElectronDBManager().count(tableName, query);
    }
    return getIndexedDBManager().count(tableName as StoreName, query);
  },

  /**
   * Clear all documents from a store (IndexedDB only)
   */
  async clear(storeName: StoreName): Promise<void> {
    if (isElectron()) {
      // For Electron, delete all records
      await getElectronDBManager().delete(storeName, {}, { multi: true });
      return;
    }
    return getIndexedDBManager().clear(storeName);
  },

  /**
   * Trigger sync (Electron only)
   */
  async sync(): Promise<{ success: boolean; error?: string }> {
    if (isElectron()) {
      return getElectronDBManager().syncRecords();
    }
    // For web, sync is handled differently (via API calls)
    return { success: true };
  },

  /**
   * Check if running in Electron
   */
  isElectron,
};

/**
 * Sync Queue Manager
 *
 * Manages pending changes that need to be synced to the server
 */
export const syncQueue = {
  /**
   * Add a change to the sync queue
   */
  async add(
    data: Record<string, unknown>,
    type: "insert" | "update" | "delete" = "insert",
  ): Promise<void> {
    await db.insert(STORES.SYNC_QUEUE, {
      data,
      type,
      timestamp: Date.now(),
      synced: false,
    });
  },

  /**
   * Get all pending changes
   */
  async getPending(): Promise<DBRecord[]> {
    return db.find(STORES.SYNC_QUEUE, {
      synced: { $ne: true } as unknown as boolean,
    });
  },

  /**
   * Get count of pending changes
   */
  async getPendingCount(): Promise<number> {
    return db.count(STORES.SYNC_QUEUE, {
      synced: { $ne: true } as unknown as boolean,
    });
  },

  /**
   * Mark a change as synced
   */
  async markSynced(id: string): Promise<void> {
    await db.update(STORES.SYNC_QUEUE, { _id: id }, { $set: { synced: true } });
  },

  /**
   * Clear all synced items
   */
  async clearSynced(): Promise<void> {
    await db.delete(STORES.SYNC_QUEUE, { synced: true });
  },

  /**
   * Clear all pending items
   */
  async clearAll(): Promise<void> {
    await db.clear(STORES.SYNC_QUEUE);
  },
};

export default db;
