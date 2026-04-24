import Database from "better-sqlite3";
import { safeStorage, BrowserWindow } from "electron";
import path from "node:path";
import { app } from "electron";
import fs from "node:fs";
import { generateUUID } from "../utils/uuid.js";
/**
 * Evaluate a MongoDB-style query object against a document.
 * Supports: exact match, $ne, $gt, $lt, $gte, $lte, $in, $nin, $exists, $regex
 */
function matchesQuery(doc, query) {
    if (!query || typeof query !== "object")
        return true;
    return Object.entries(query).every(([key, condition]) => {
        const value = doc[key];
        if (condition === null || condition === undefined) {
            return value === condition;
        }
        if (typeof condition === "object" && !Array.isArray(condition)) {
            // Operator object, e.g. { $ne: true }
            return Object.entries(condition).every(([op, operand]) => {
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
                        const regex = operand instanceof RegExp ? operand : new RegExp(operand);
                        return typeof value === "string" && regex.test(value);
                    }
                    default:
                        return value === operand;
                }
            });
        }
        return value === condition;
    });
}
class DatabaseManager {
    db;
    dbDir;
    knownTables = new Set();
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
    ensureDB() {
        if (this.db)
            return this.db;
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
    broadcastChange(event) {
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
    ensureTable(tableName) {
        if (this.knownTables.has(tableName))
            return;
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
        db.exec(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_createdAt" ON "${tableName}" (createdAt);`);
        this.knownTables.add(tableName);
    }
    /**
     * Encrypt a document for storage
     */
    encrypt(doc) {
        const json = JSON.stringify(doc);
        return safeStorage.encryptString(json).toString("base64");
    }
    /**
     * Decrypt a stored blob back to a document
     */
    decrypt(cipher) {
        const buffer = Buffer.from(cipher, "base64");
        const json = safeStorage.decryptString(buffer);
        return JSON.parse(json);
    }
    /**
     * Get or create a "table" (for API compatibility — returns tableName)
     * @param tableName Name of the table
     */
    getTable(tableName) {
        this.ensureTable(tableName);
        return tableName;
    }
    /**
     * Insert or update a record intelligently
     * @param tableName Name of the table
     * @param doc Document to insert or update
     * @param isIncoming Flag indicating data is from Supabase (don't generate uuid)
     */
    async insert(tableName, doc, isIncoming = false) {
        this.ensureTable(tableName);
        let query = {};
        if (doc._id)
            query = { _id: doc._id };
        else if (doc.uuid)
            query = { uuid: doc.uuid };
        else if (tableName === "users") {
            if (doc.email)
                query = { email: doc.email };
            else if (doc.username)
                query = { username: doc.username };
        }
        const existing = Object.keys(query).length > 0
            ? await this.findOne(tableName, query)
            : null;
        if (existing) {
            const { _id, ...updateData } = doc;
            await this.update(tableName, query, { $set: updateData }, { multi: false }, isIncoming);
            return { ...existing, ...updateData };
        }
        if (!doc.uuid ||
            (!doc.id && tableName !== "users" && !isIncoming)) {
            const id = generateUUID();
            doc.uuid = id;
            doc.id = id;
        }
        const now = new Date().toISOString();
        const _id = doc._id || generateUUID();
        const docWithMeta = {
            ...doc,
            _id,
            createdAt: doc.createdAt || now,
            updatedAt: now,
        };
        const db = this.ensureDB();
        const stmt = db.prepare(`INSERT OR REPLACE INTO "${tableName}" (_id, doc_data, createdAt, updatedAt) VALUES (?, ?, ?, ?)`);
        stmt.run(_id, this.encrypt(docWithMeta), docWithMeta.createdAt, now);
        if (!isIncoming && tableName !== "sync_queue") {
            this.addToSyncQueue(tableName, _id, "insert", docWithMeta, now);
        }
        this.broadcastChange({
            table: tableName,
            action: "insert",
            data: docWithMeta,
        });
        return docWithMeta;
    }
    async insertMany(tableName, docs, isIncoming = false) {
        if (docs.length === 0)
            return [];
        this.ensureTable(tableName);
        const db = this.ensureDB();
        const now = new Date().toISOString();
        const stmt = db.prepare(`INSERT OR REPLACE INTO "${tableName}" (_id, doc_data, createdAt, updatedAt) VALUES (?, ?, ?, ?)`);
        const insertAll = db.transaction(() => {
            const results = [];
            for (const doc of docs) {
                const cloned = { ...doc };
                if (!cloned.uuid && tableName !== "users" && !isIncoming) {
                    const id = generateUUID();
                    cloned.uuid = id;
                    cloned.id = id;
                }
                const _id = cloned._id || generateUUID();
                const docWithMeta = {
                    ...cloned,
                    _id,
                    createdAt: cloned.createdAt || now,
                    updatedAt: now,
                };
                stmt.run(_id, this.encrypt(docWithMeta), docWithMeta.createdAt, now);
                results.push(docWithMeta);
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
    getAllDocs(tableName) {
        this.ensureTable(tableName);
        const db = this.ensureDB();
        const rows = db
            .prepare(`SELECT doc_data FROM "${tableName}"`)
            .all();
        return rows.map((row) => this.decrypt(row.doc_data));
    }
    /**
     * Find records in a table
     */
    async find(tableName, query = {}, sort = { createdAt: -1 }, limit, skip) {
        const allDocs = this.getAllDocs(tableName);
        // Filter
        let results = allDocs.filter((doc) => matchesQuery(doc, query));
        // Sort
        if (sort && typeof sort === "object") {
            const sortEntries = Object.entries(sort);
            if (sortEntries.length > 0) {
                results.sort((a, b) => {
                    for (const [key, direction] of sortEntries) {
                        const dir = direction;
                        if (a[key] < b[key])
                            return -1 * dir;
                        if (a[key] > b[key])
                            return 1 * dir;
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
    async findOne(tableName, query = {}) {
        const results = await this.find(tableName, query, {}, 1);
        return results[0] || null;
    }
    /**
     * Find many records
     */
    async findMany(tableName, query) {
        return this.find(tableName, query, {});
    }
    /**
     * Update records
     */
    async update(tableName, query, update, options = { multi: true }, isIncoming = false) {
        this.ensureTable(tableName);
        const db = this.ensureDB();
        const allDocs = this.getAllDocs(tableName);
        const matching = allDocs.filter((doc) => matchesQuery(doc, query));
        if (matching.length === 0)
            return 0;
        // Extract the actual update data from $set if present
        const updateData = update && typeof update === "object" && "$set" in update
            ? update.$set
            : update;
        const now = new Date().toISOString();
        const stmt = db.prepare(`UPDATE "${tableName}" SET doc_data = ?, updatedAt = ? WHERE _id = ?`);
        const docsToUpdate = options?.multi === false ? [matching[0]] : matching;
        const updateAll = db.transaction(() => {
            let count = 0;
            for (const doc of docsToUpdate) {
                if (!doc)
                    continue;
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
    async delete(tableName, query, options = { multi: true }, isIncoming = false) {
        this.ensureTable(tableName);
        const db = this.ensureDB();
        const allDocs = this.getAllDocs(tableName);
        const matching = allDocs.filter((doc) => matchesQuery(doc, query));
        if (matching.length === 0)
            return 0;
        const docsToDelete = options?.multi === false ? [matching[0]] : matching;
        const stmt = db.prepare(`DELETE FROM "${tableName}" WHERE _id = ?`);
        const deleteAll = db.transaction(() => {
            let count = 0;
            for (const doc of docsToDelete) {
                if (!doc)
                    continue;
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
    async count(tableName, query = {}) {
        // If no query filters, use SQL count for speed
        if (!query || Object.keys(query).length === 0) {
            this.ensureTable(tableName);
            const db = this.ensureDB();
            const row = db
                .prepare(`SELECT COUNT(*) as cnt FROM "${tableName}"`)
                .get();
            return row.cnt;
        }
        // Otherwise filter in-memory
        const docs = this.getAllDocs(tableName);
        return docs.filter((doc) => matchesQuery(doc, query)).length;
    }
    /**
     * Ensure index on a table for performance/uniqueness
     * (In better-sqlite3, this creates an actual SQL index on the _id column.
     *  Since docs are stored as encrypted blobs, field-level SQL indexes aren't
     *  possible. This is kept for API compatibility.)
     */
    async ensureIndex(tableName, _fieldName, _unique = false) {
        this.ensureTable(tableName);
    }
    /**
     * Add to sync queue
     */
    addToSyncQueue(tableName, recordId, action, payload, timestamp) {
        this.ensureTable("sync_queue");
        const db = this.ensureDB();
        // Only queue specific tables or skip specific ones if needed.
        // Assuming we sync specific data tables, e.g., scanned_records, staff, etc.
        const ignoredTables = ["sync_queue"];
        if (ignoredTables.includes(tableName))
            return;
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
        const stmt = db.prepare(`INSERT OR REPLACE INTO "sync_queue" (_id, doc_data, createdAt, updatedAt) VALUES (?, ?, ?, ?)`);
        stmt.run(_id, this.encrypt(queueDoc), timestamp, timestamp);
    }
    /**
     * Close the database connection (call on app quit)
     */
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}
export const dbManager = new DatabaseManager();
