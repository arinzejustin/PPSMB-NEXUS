import Database, { type Database as DatabaseType } from "better-sqlite3";
import { safeStorage, BrowserWindow } from "electron";
import path from "node:path";
import { app } from "electron";
import fs from "node:fs";
import { generateUUID } from "../utils/uuid.js";

export interface DatabaseChangeEvent {
  table: string;
  action: "insert" | "update" | "delete";
  data?: any;
}

/**
 * Evaluate a MongoDB-style query object against a document.
 * Supports: exact match, $ne, $gt, $lt, $gte, $lte, $in, $nin, $exists, $regex
 */
function matchesQuery(doc: Record<string, any>, query: any): boolean {
  if (!query || typeof query !== "object") return true;

  return Object.entries(query).every(([key, condition]) => {
    const value = doc[key];

    if (condition === null || condition === undefined) {
      return value === condition;
    }

    if (typeof condition === "object" && !Array.isArray(condition)) {
      // Operator object, e.g. { $ne: true }
      return Object.entries(condition as Record<string, any>).every(
        ([op, operand]) => {
          switch (op) {
            case "$ne":
              return value !== operand;
            case "$gt":
              return value > operand;
            case "$lt":
              return value < operand;
            case "$gte":
              return value >= operand;
            case "$lte":
              return value <= operand;
            case "$in":
              return Array.isArray(operand) && operand.includes(value);
            case "$nin":
              return Array.isArray(operand) && !operand.includes(value);
            case "$exists":
              return operand ? value !== undefined : value === undefined;
            case "$regex": {
              const regex =
                operand instanceof RegExp ? operand : new RegExp(operand);
              return typeof value === "string" && regex.test(value);
            }
            default:
              return value === operand;
          }
        },
      );
    }
    return value === condition;
  });
}

class DatabaseManager {
  private db!: DatabaseType;
  private dbDir: string;
  private knownTables: Set<string> = new Set();

  constructor() {
    this.dbDir = path.join(app.getPath("userData"), "database");
    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir, { recursive: true });
    }
  }

  /**
   * Lazily initialise the SQLite connection the first time it's needed.
   * Must be called after `app.whenReady()` since `safeStorage` requires it.
   */
  private ensureDB(): DatabaseType {
    if (this.db) return this.db;

    const dbPath = path.join(this.dbDir, "app.sqlite");
    this.db = new Database(dbPath);

    // Performance pragmas
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("foreign_keys = ON");

    return this.db;
  }

  /**
   * Broadcast database change to all renderer windows
   */
  private broadcastChange(event: DatabaseChangeEvent): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("database-change", event);
      }
    });
  }

  /**
   * Ensure the table exists in SQLite.
   * Each "table" stores documents as encrypted JSON blobs with an _id primary key.
   * Extra indexed columns: uuid, email, username for fast lookups.
   */
  private ensureTable(tableName: string): void {
    if (this.knownTables.has(tableName)) return;

    const db = this.ensureDB();
    db.exec(`
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        _id         TEXT PRIMARY KEY,
        doc_data    TEXT NOT NULL,
        createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt   TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Helper indices for common lookup fields
    db.exec(
      `CREATE INDEX IF NOT EXISTS "idx_${tableName}_createdAt" ON "${tableName}" (createdAt);`,
    );

    this.knownTables.add(tableName);
  }

  /**
   * Encrypt a document for storage
   */
  private encrypt(doc: Record<string, any>): string {
    const json = JSON.stringify(doc);
    return safeStorage.encryptString(json).toString("base64");
  }

  /**
   * Decrypt a stored blob back to a document
   */
  private decrypt(cipher: string): Record<string, any> {
    const buffer = Buffer.from(cipher, "base64");
    const json = safeStorage.decryptString(buffer);
    return JSON.parse(json);
  }

  /**
   * Get or create a "table" (for API compatibility — returns tableName)
   * @param tableName Name of the table
   */
  public getTable(tableName: string): string {
    this.ensureTable(tableName);
    return tableName;
  }

  /**
   * Insert or update a record intelligently
   * @param tableName Name of the table
   * @param doc Document to insert or update
   * @param isIncoming Flag indicating data is from Supabase (don't generate uuid)
   */
  public async insert<T extends Record<string, any>>(
    tableName: string,
    doc: T,
    isIncoming: boolean = false,
  ): Promise<T> {
    this.ensureTable(tableName);

    let query: any = {};

    if (doc._id) query = { _id: doc._id };
    else if (doc.uuid) query = { uuid: doc.uuid };
    else if (tableName === "users") {
      if (doc.email) query = { email: doc.email };
      else if (doc.username) query = { username: doc.username };
    }

    const existing =
      Object.keys(query).length > 0
        ? await this.findOne<T>(tableName, query)
        : null;

    if (existing) {
      const { _id, ...updateData } = doc;
      await this.update(
        tableName,
        query,
        { $set: updateData },
        { multi: false },
        isIncoming
      );
      return { ...existing, ...updateData } as T;
    }

    if (
      !(doc as any).uuid ||
      (!(doc as any).id && tableName !== "users" && !isIncoming)
    ) {
      const id = generateUUID();
      (doc as any).uuid = id;
      (doc as any).id = id;
    }

    const now = new Date().toISOString();
    const _id = (doc as any)._id || generateUUID();
    const docWithMeta = {
      ...doc,
      _id,
      createdAt: (doc as any).createdAt || now,
      updatedAt: now,
    };

    const db = this.ensureDB();
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO "${tableName}" (_id, doc_data, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
    );
    stmt.run(_id, this.encrypt(docWithMeta), docWithMeta.createdAt, now);

    if (!isIncoming && tableName !== "sync_queue") {
      this.addToSyncQueue(tableName, _id, "insert", docWithMeta, now);
    }

    this.broadcastChange({
      table: tableName,
      action: "insert",
      data: docWithMeta,
    });

    return docWithMeta as T;
  }

  public async insertMany<T extends Record<string, any>>(
    tableName: string,
    docs: T[],
    isIncoming: boolean = false,
  ): Promise<T[]> {
    if (docs.length === 0) return [];

    this.ensureTable(tableName);
    const db = this.ensureDB();

    const now = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO "${tableName}" (_id, doc_data, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
    );

    const insertAll = db.transaction(() => {
      const results: T[] = [];

      for (const doc of docs) {
        const cloned = { ...doc };

        if (!(cloned as any).uuid && tableName !== "users" && !isIncoming) {
          const id = generateUUID();
          (cloned as any).uuid = id;
          (cloned as any).id = id;
        }

        const _id = (cloned as any)._id || generateUUID();
        const docWithMeta = {
          ...cloned,
          _id,
          createdAt: (cloned as any).createdAt || now,
          updatedAt: now,
        };

        stmt.run(
          _id,
          this.encrypt(docWithMeta),
          docWithMeta.createdAt,
          now,
        );
        results.push(docWithMeta as T);
        
        if (!isIncoming && tableName !== "sync_queue") {
          this.addToSyncQueue(tableName, _id, "insert", docWithMeta, now);
        }
      }

      return results;
    });

    const results = insertAll();

    this.broadcastChange({
      table: tableName,
      action: "insert",
      data: results,
    });

    return results;
  }

  /**
   * Retrieve and decrypt all rows from a table, then apply in-memory filtering/sorting.
   */
  private getAllDocs<T>(tableName: string): T[] {
    this.ensureTable(tableName);
    const db = this.ensureDB();

    const rows = db
      .prepare(`SELECT doc_data FROM "${tableName}"`)
      .all() as { doc_data: string }[];

    return rows.map((row) => this.decrypt(row.doc_data) as T);
  }

  /**
   * Find records in a table
   */
  public async find<T>(
    tableName: string,
    query: any = {},
    sort: any = { createdAt: -1 },
    limit?: number,
    skip?: number,
  ): Promise<T[]> {
    const allDocs = this.getAllDocs<T>(tableName);

    // Filter
    let results = allDocs.filter((doc) =>
      matchesQuery(doc as Record<string, any>, query),
    );

    // Sort
    if (sort && typeof sort === "object") {
      const sortEntries = Object.entries(sort);
      if (sortEntries.length > 0) {
        results.sort((a: any, b: any) => {
          for (const [key, direction] of sortEntries) {
            const dir = direction as number;
            if (a[key] < b[key]) return -1 * dir;
            if (a[key] > b[key]) return 1 * dir;
          }
          return 0;
        });
      }
    }

    // Skip
    if (skip !== undefined && skip > 0) {
      results = results.slice(skip);
    }

    // Limit
    if (limit !== undefined && limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Find one record
   */
  public async findOne<T>(
    tableName: string,
    query: any = {},
  ): Promise<T | null> {
    const results = await this.find<T>(tableName, query, {}, 1);
    return results[0] || null;
  }

  /**
   * Find many records
   */
  public async findMany<T>(tableName: string, query: any): Promise<T[]> {
    return this.find<T>(tableName, query, {});
  }

  /**
   * Update records
   */
  public async update(
    tableName: string,
    query: any,
    update: any,
    options: any = { multi: true },
    isIncoming: boolean = false
  ): Promise<number> {
    this.ensureTable(tableName);
    const db = this.ensureDB();

    const allDocs = this.getAllDocs<Record<string, any>>(tableName);
    const matching = allDocs.filter((doc) => matchesQuery(doc, query));

    if (matching.length === 0) return 0;

    // Extract the actual update data from $set if present
    const updateData =
      update && typeof update === "object" && "$set" in update
        ? update.$set
        : update;

    const now = new Date().toISOString();
    const stmt = db.prepare(
      `UPDATE "${tableName}" SET doc_data = ?, updatedAt = ? WHERE _id = ?`,
    );

    const docsToUpdate = options?.multi === false ? [matching[0]!] : matching;

    const updateAll = db.transaction(() => {
      let count = 0;
      for (const doc of docsToUpdate) {
        if (!doc) continue;
        const updatedDoc = { ...doc, ...updateData, updatedAt: now };
        stmt.run(this.encrypt(updatedDoc), now, doc._id);
        
        if (!isIncoming && tableName !== "sync_queue") {
          this.addToSyncQueue(tableName, doc._id, "update", updatedDoc, now);
        }
        
        count++;
      }
      return count;
    });

    const numReplaced = updateAll();

    if (numReplaced > 0) {
      this.broadcastChange({
        table: tableName,
        action: "update",
        data: { query, update, count: numReplaced },
      });
    }

    return numReplaced;
  }

  /**
   * Delete records
   */
  public async delete(
    tableName: string,
    query: any,
    options: any = { multi: true },
    isIncoming: boolean = false
  ): Promise<number> {
    this.ensureTable(tableName);
    const db = this.ensureDB();

    const allDocs = this.getAllDocs<Record<string, any>>(tableName);
    const matching = allDocs.filter((doc) => matchesQuery(doc, query));

    if (matching.length === 0) return 0;

    const docsToDelete = options?.multi === false ? [matching[0]!] : matching;

    const stmt = db.prepare(`DELETE FROM "${tableName}" WHERE _id = ?`);

    const deleteAll = db.transaction(() => {
      let count = 0;
      for (const doc of docsToDelete) {
        if (!doc) continue;
        stmt.run(doc._id);
        
        if (!isIncoming && tableName !== "sync_queue") {
          this.addToSyncQueue(tableName, doc._id, "delete", doc, new Date().toISOString());
        }
        
        count++;
      }
      return count;
    });

    const numRemoved = deleteAll();

    if (numRemoved > 0) {
      this.broadcastChange({
        table: tableName,
        action: "delete",
        data: { query, count: numRemoved },
      });
    }

    return numRemoved;
  }

  /**
   * Count records
   */
  public async count(tableName: string, query: any = {}): Promise<number> {
    // If no query filters, use SQL count for speed
    if (!query || Object.keys(query).length === 0) {
      this.ensureTable(tableName);
      const db = this.ensureDB();
      const row = db
        .prepare(`SELECT COUNT(*) as cnt FROM "${tableName}"`)
        .get() as { cnt: number };
      return row.cnt;
    }

    // Otherwise filter in-memory
    const docs = this.getAllDocs<Record<string, any>>(tableName);
    return docs.filter((doc) => matchesQuery(doc, query)).length;
  }

  /**
   * Ensure index on a table for performance/uniqueness
   * (In better-sqlite3, this creates an actual SQL index on the _id column.
   *  Since docs are stored as encrypted blobs, field-level SQL indexes aren't
   *  possible. This is kept for API compatibility.)
   */
  public async ensureIndex(
    tableName: string,
    _fieldName: string,
    _unique: boolean = false,
  ): Promise<void> {
    this.ensureTable(tableName);
  }

  /**
   * Add to sync queue
   */
  private addToSyncQueue(
    tableName: string,
    recordId: string,
    action: "insert" | "update" | "delete",
    payload: any,
    timestamp: string
  ) {
    this.ensureTable("sync_queue");
    const db = this.ensureDB();
    
    // Only queue specific tables or skip specific ones if needed.
    // Assuming we sync specific data tables, e.g., scanned_records, staff, etc.
    const ignoredTables = ["sync_queue"];
    if (ignoredTables.includes(tableName)) return;

    const _id = generateUUID();
    const queueDoc = {
      _id,
      table: tableName,
      record_id: recordId,
      action,
      payload,
      createdAt: timestamp,
      updatedAt: timestamp,
      synced: false,
    };
    
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO "sync_queue" (_id, doc_data, createdAt, updatedAt) VALUES (?, ?, ?, ?)`
    );
    stmt.run(_id, this.encrypt(queueDoc), timestamp, timestamp);
  }

  /**
   * Close the database connection (call on app quit)
   */
  public close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

export const dbManager = new DatabaseManager();
