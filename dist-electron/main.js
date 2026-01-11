import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, } from "electron";
import path from "node:path";
// import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { setupAutoUpdater } from "./updater.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// let db: Database.Database;
let win = null;
let tray = null;
let isAppQuitting = false;
function createWindow() {
    if (win) {
        if (win.isMinimized())
            win.restore();
        win.focus();
        return;
    }
    win = new BrowserWindow({
        width: 1200,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, "../public/favicon.ico"),
        minWidth: 400,
        minHeight: 300,
        show: true,
    });
    win.setMenuBarVisibility(false);
    setupAutoUpdater(win);
    // initDB();
    const isDev = !app.isPackaged;
    if (isDev) {
        win.loadURL("http://localhost:3000");
    }
    else {
        win.loadFile(path.join(__dirname, "../.output/public/index.html"));
    }
    win.on("close", (event) => {
        if (!isAppQuitting) {
            if (!win)
                return;
            event.preventDefault();
            win.hide();
            return;
        }
    });
    setupTray();
    win.webContents.on("context-menu", (_event, params) => {
        const payload = {
            exit: true,
            version: true,
            __version: app.getVersion(),
            check: true,
            release: "https://hello.com",
            copyVersion: true,
            restart: true,
        };
        if (params.isEditable) {
            payload.cut = true;
            payload.copy = true;
            payload.paste = true;
        }
        if (params.selectionText) {
            payload.copy = true;
        }
        if (params.linkURL) {
            payload.openLink = true;
            payload.linkUrl = params.linkURL;
        }
        payload.x = params.x;
        payload.y = params.y;
        win?.webContents.send("open-context-menu", payload);
        _event.preventDefault();
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
                win?.show();
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
        }
        else {
            win?.show();
        }
    });
}
ipcMain.handle("db:get-data", (event, key) => {
    // const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    // return row ? row.value : null;
});
ipcMain.handle("open-modal", (_event, routeUrl, options) => {
    const allWindows = BrowserWindow.getAllWindows();
    const existingModal = allWindows.find((w) => w !== win && !w.isDestroyed());
    if (existingModal) {
        existingModal.focus();
        if (routeUrl.includes("http")) {
            existingModal.loadURL(routeUrl);
        }
        else {
            existingModal.loadFile(routeUrl);
        }
        return;
    }
    console.log(options.icon);
    if (!options.icon) {
        options.icon = path.join(__dirname, "../public/favicon.ico");
    }
    console.log(options.icon);
    const modal = new BrowserWindow({
        parent: win,
        modal: true,
        width: options.width || 800,
        height: options.height || 600,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
        },
        ...options,
    });
    modal.setMenuBarVisibility(false);
    if (routeUrl.includes("http")) {
        modal.loadURL(routeUrl);
    }
    else {
        modal.loadFile(routeUrl);
    }
    modal.once("ready-to-show", () => {
        modal.show();
    });
});
ipcMain.handle("open-browser", (_event, url) => {
    shell.openExternal(url);
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
        app.quit();
    }
});
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && win === null)
        createWindow();
});
