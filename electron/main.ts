import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import Database from "better-sqlite3";

let db: any;

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../public/favicon.ico"),
    autoHideMenuBar: true,
    minWidth: 400,
    minHeight: 400,
    skipTaskbar: true,

  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL("http://localhost:3000");
  } else {
    win.loadFile(path.join(__dirname, "../.output/public/index.html"));
  }

  initDB();
}

function initDB() {
  const dbPath = path.join(app.getPath("userData"), "local.db");
  db = new Database(dbPath);
  db.exec(
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)"
  );
}

// Secure Bridge Handler
ipcMain.handle("db:get-data", (event, key) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : null;
});

app.whenReady().then(createWindow);
