import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let db;
function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, "../public/favicon.ico"),
        autoHideMenuBar: true,
        minWidth: 400,
        minHeight: 300,
        skipTaskbar: false,
    });
    const isDev = !app.isPackaged;
    if (isDev) {
        win.loadURL("http://localhost:3000");
    }
    else {
        win.loadFile(path.join(__dirname, "../.output/public/index.html"));
    }
    initDB();
}
function initDB() {
    const dbPath = path.join(app.getPath("userData"), "local.db");
    db = new Database(dbPath);
    db.exec("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)");
}
// Secure Bridge Handler
ipcMain.handle("db:get-data", (event, key) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? row.value : null;
});
app.whenReady().then(createWindow);
