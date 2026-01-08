import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from "electron";
import path from "node:path";
// import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { setupAutoUpdater } from "./updater.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// let db: Database.Database;
let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let isAppQuitting = false;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../public/favicon.ico"),
    autoHideMenuBar: true,
    minWidth: 400,
    minHeight: 300,
    show: true,
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL("http://localhost:3000");
  } else {
    win.loadFile(path.join(__dirname, "../.output/public/index.html"));
  }

  win.on("close", (event) => {
    if (!isAppQuitting) {
      event.preventDefault();
      win?.hide();
      return;
    }
  });

  // initDB();
  setupTray();

  win.once("ready-to-show", () => {
    if (!win) return;
    setupAutoUpdater(win);
  });
}

// function initDB() {
//   const dbPath = path.join(app.getPath("userData"), "local.db");
//   db = new Database(dbPath);
//   db.pragma("journal_mode = WAL");
//   db.exec(
//     "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)"
//   );
// }

function setupTray() {
  const iconPath = path.join(__dirname, "../public/favicon.ico");
  const image = nativeImage.createFromPath(iconPath);

  if (image.isEmpty()) {
    console.error("Failed to load tray icon at:", iconPath);
  } else {
    console.log(iconPath)
  }

  tray = new Tray(image);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open App",
      click: () => {
        win?.show();
      },
    },
    {
      label: "Scan Document",
      click: () => {
        win?.webContents.send("scan-document");
      },
    },
    {
      label: "Quit",
      click: () => {
        isAppQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Staff Manager");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (win?.isVisible()) {
      win.hide();
    } else {
      win?.show();
    }
  });
}

ipcMain.handle("db:get-data", (event, key) => {
  // const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  // return row ? row.value : null;
});

app.whenReady().then(createWindow);

app.on("before-quit", () => {
  isAppQuitting = true;
  // if (db) db.close();
});

app.on("will-quit", () => {
  // if (db) db.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
  }
});

app.on("activate", () => {
  if (win === null) createWindow();
});


