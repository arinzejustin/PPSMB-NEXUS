import Datastore from "@seald-io/nedb";
import { safeStorage } from "electron";
import path from "node:path";
import { app } from "electron";
import fs from "node:fs";
import { generateUUID } from "../utils/uuid.js";
class DatabaseManager {
    stores = new Map();
    dbDir;
    constructor() {
        this.dbDir = path.join(app.getPath("userData"), "database");
        if (!fs.existsSync(this.dbDir)) {
            fs.mkdirSync(this.dbDir, { recursive: true });
        }
    }
    /**
     * Get or create a "table" (datastore)
     * @param tableName Name of the table
     */
    getTable(tableName) {
        if (this.stores.has(tableName)) {
            return this.stores.get(tableName);
        }
        const store = new Datastore({
            filename: path.join(this.dbDir, `${tableName}.db`),
            autoload: true,
            timestampData: true,
            afterSerialization: (plaintext) => {
                return safeStorage.encryptString(plaintext).toString("base64");
            },
            beforeDeserialization: (ciphertext) => {
                const buffer = Buffer.from(ciphertext, "base64");
                return safeStorage.decryptString(buffer);
            },
        });
        store.persistence.setAutocompactionInterval(24 * 60 * 60 * 1000);
        this.stores.set(tableName, store);
        return store;
    }
    /**
     * Insert or update a record intelligently
     * @param tableName Name of the table
     * @param doc Document to insert or update
     * @param isIncoming Flag indicating data is from Supabase (don't generate uuid)
     */
    async insert(tableName, doc, isIncoming = false) {
        const store = this.getTable(tableName);
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
            await this.update(tableName, query, { $set: updateData }, { multi: false });
            return { ...existing, ...updateData };
        }
        if (!doc.uuid && tableName !== "users" && !isIncoming) {
            doc.uuid = generateUUID();
        }
        return new Promise((resolve, reject) => {
            store.insert(doc, (err, newDoc) => {
                if (err)
                    reject(err);
                else
                    resolve(newDoc);
            });
        });
    }
    /**
     * Find records in a table
     */
    async find(tableName, query = {}, sort = { createdAt: -1 }, limit, skip) {
        const store = this.getTable(tableName);
        return new Promise((resolve, reject) => {
            let cursor = store.find(query).sort(sort);
            if (skip !== undefined)
                cursor = cursor.skip(skip);
            if (limit !== undefined)
                cursor = cursor.limit(limit);
            cursor.exec((err, docs) => {
                if (err)
                    reject(err);
                else
                    resolve(docs);
            });
        });
    }
    /**
     * Find one record
     */
    async findOne(tableName, query = {}) {
        const store = this.getTable(tableName);
        return new Promise((resolve, reject) => {
            store.findOne(query, (err, doc) => {
                if (err)
                    reject(err);
                else
                    resolve(doc);
            });
        });
    }
    /**
     * Update records
     */
    async update(tableName, query, update, options = { multi: true }) {
        const store = this.getTable(tableName);
        return new Promise((resolve, reject) => {
            store.update(query, update, options, (err, numReplaced) => {
                if (err)
                    reject(err);
                else
                    resolve(numReplaced);
            });
        });
    }
    /**
     * Delete records
     */
    async delete(tableName, query, options = { multi: true }) {
        const store = this.getTable(tableName);
        return new Promise((resolve, reject) => {
            store.remove(query, options, (err, numRemoved) => {
                if (err)
                    reject(err);
                else
                    resolve(numRemoved);
            });
        });
    }
    /**
     * Count records
     */
    async count(tableName, query = {}) {
        const store = this.getTable(tableName);
        return new Promise((resolve, reject) => {
            store.count(query, (err, count) => {
                if (err)
                    reject(err);
                else
                    resolve(count);
            });
        });
    }
    /**
     * Ensure index on a table for performance/uniqueness
     */
    async ensureIndex(tableName, fieldName, unique = false) {
        const store = this.getTable(tableName);
        return new Promise((resolve, reject) => {
            store.ensureIndex({ fieldName, unique }, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
}
export const dbManager = new DatabaseManager();
