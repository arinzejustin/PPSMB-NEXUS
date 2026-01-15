import Database from "better-sqlite3";
import path from "node:path";
let database = null;
export function initDB(app) {
    if (database)
        return;
    const dbPath = path.join(app.getPath("userData"), "local.db");
    database = new Database(dbPath);
    database.pragma("journal_mode = WAL");
    database.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)");
}
export function closeDB() {
    if (database)
        database.close();
}
