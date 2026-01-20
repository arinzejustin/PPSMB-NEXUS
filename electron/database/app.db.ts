import Datastore from "@seald-io/nedb";
import { safeStorage } from "electron";
import path from "node:path";
import { app } from "electron";
import fs from "node:fs";
import { generateUUID } from "../utils/uuid.js";

class DatabaseManager {
  private stores: Map<string, Datastore> = new Map();
  private dbDir: string;

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
  public getTable(tableName: string): Datastore {
    if (this.stores.has(tableName)) {
      return this.stores.get(tableName)!;
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
  public async insert<T extends Record<string, any>>(
    tableName: string,
    doc: T,
    isIncoming: boolean = false,
  ): Promise<T> {
    const store = this.getTable(tableName);

    let query: any = {};

    if (doc._id) query = { _id: doc._id };
    else if (doc.uuid) query = { uuid: doc.uuid };
    else if (tableName === "users") {
      if (doc.email) query = { email: doc.email };
      else if (doc.username) query = { username: doc.username };
    }

    console.log(query);

    const existing =
      Object.keys(query).length > 0
        ? await this.findOne<T>(tableName, query)
        : null;

    console.log(existing);

    if (existing) {
      const { _id, ...updateData } = doc;
      await this.update(
        tableName,
        query,
        { $set: updateData },
        { multi: false },
      );
      return { ...existing, ...updateData } as T;
    }

    if (!(doc as any).uuid && tableName !== "users" && !isIncoming) {
      (doc as any).uuid = generateUUID();
    }

    return new Promise((resolve, reject) => {
      store.insert(doc as any, (err, newDoc) => {
        if (err) reject(err);
        else resolve(newDoc as T);
      });
    });
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
    const store = this.getTable(tableName);
    return new Promise((resolve, reject) => {
      let cursor = store.find(query).sort(sort);
      if (skip !== undefined) cursor = cursor.skip(skip);
      if (limit !== undefined) cursor = cursor.limit(limit);

      cursor.exec((err, docs) => {
        if (err) reject(err);
        else resolve(docs as T[]);
      });
    });
  }

  /**
   * Find one record
   */
  public async findOne<T>(
    tableName: string,
    query: any = {},
  ): Promise<T | null> {
    const store = this.getTable(tableName);
    console.log(query, tableName);
    return new Promise((resolve, reject) => {
      store.findOne(query, (err, doc) => {
        if (err) reject(err);
        else resolve(doc as T | null);
      });
    });
  }

  /**
   * Update records
   */
  public async update(
    tableName: string,
    query: any,
    update: any,
    options: any = { multi: true },
  ): Promise<number> {
    const store = this.getTable(tableName);
    return new Promise((resolve, reject) => {
      store.update(query, update, options, (err, numReplaced) => {
        if (err) reject(err);
        else resolve(numReplaced);
      });
    });
  }

  /**
   * Delete records
   */
  public async delete(
    tableName: string,
    query: any,
    options: any = { multi: true },
  ): Promise<number> {
    const store = this.getTable(tableName);
    return new Promise((resolve, reject) => {
      store.remove(query, options, (err, numRemoved) => {
        if (err) reject(err);
        else resolve(numRemoved);
      });
    });
  }

  /**
   * Count records
   */
  public async count(tableName: string, query: any = {}): Promise<number> {
    const store = this.getTable(tableName);
    return new Promise((resolve, reject) => {
      store.count(query, (err, count) => {
        if (err) reject(err);
        else resolve(count);
      });
    });
  }

  /**
   * Ensure index on a table for performance/uniqueness
   */
  public async ensureIndex(
    tableName: string,
    fieldName: string,
    unique: boolean = false,
  ): Promise<void> {
    const store = this.getTable(tableName);
    return new Promise((resolve, reject) => {
      store.ensureIndex({ fieldName, unique }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export const dbManager = new DatabaseManager();
