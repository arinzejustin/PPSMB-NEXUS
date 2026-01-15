import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, crashReporter, } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import axios from "axios";
import { NotificationService } from "./utils/notification.js";
import { setupAutoUpdater } from "./utils/updater.js";
import log from "./utils/logger.js";
// import { initDB, closeDB } from "./database/app.db.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let win = null;
let tray = null;
let isAppQuitting = false;
let retryCount = 0;
async function ensureExternalFileExists() {
    try {
        const appPath = app.getPath("userData");
        const targetFile = path.join(appPath, "scanner.exe");
        if (fs.existsSync(targetFile)) {
            retryCount = 0;
            return;
        }
        const response = await axios({
            url: "https://ppsmb.com.ng/files/scanner.exe",
            method: "GET",
            responseType: "stream",
            timeout: 30000,
        });
        const writer = fs.createWriteStream(targetFile);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on("finish", () => {
                retryCount = 0;
                resolve();
            });
            writer.on("error", (err) => {
                fs.unlink(targetFile, () => { });
                reject(err);
            });
        });
    }
    catch (error) {
        retryCount++;
        if (retryCount < 3) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            return await ensureExternalFileExists();
        }
        else {
            retryCount = 0;
            NotificationService.show("File Download Error", `Failed to download scanner.exe, app might not work normal.`);
            throw error;
        }
    }
}
async function uploadPendingCrash() {
    const crashFile = path.join(app.getPath("userData"), "ppsmb-crash", "crash-pending.json");
    if (!fs.existsSync(crashFile))
        return;
    try {
        const data = JSON.parse(fs.readFileSync(crashFile, "utf-8"));
        await axios.post("https://ppsmb.com.ng/api/crash/json", data);
        fs.unlinkSync(crashFile);
    }
    catch { }
}
crashReporter.start({
    productName: "Staff Manager",
    companyName: "PPSMB",
    submitURL: "https://api.axiolot.com.ng/ppsmb/crash/native",
    uploadToServer: true,
    compress: true,
    ignoreSystemCrashHandler: false,
    extra: {
        version: app.getVersion(),
        platform: process.platform,
    },
});
function sendCrashReport(error, origin) {
    try {
        const crashDir = path.join(app.getPath("userData"), "ppsmb-crash");
        if (!fs.existsSync(crashDir)) {
            fs.mkdirSync(crashDir, { recursive: true });
        }
        const crashFile = path.join(crashDir, "crash-pending.json");
        const crash = {
            origin,
            message: error.message,
            stack: error.stack,
            version: app.getVersion(),
            platform: process.platform,
            time: new Date().toISOString(),
            release: os.release(),
        };
        fs.writeFileSync(crashFile, JSON.stringify(crash, null, 2));
    }
    catch { }
}
async function createWindow() {
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
        backgroundColor: "#008435",
    });
    win.setMenuBarVisibility(false);
    setupAutoUpdater(win);
    // initDB(app);
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
        if (!win)
            return;
        const payload = {
            exit: true,
            version: true,
            __version: app.getVersion(),
            check: true,
            release: `https://axiolot.com.ng/ppsmb-file-manager?release=${app.getVersion()}`,
            copyVersion: true,
            restart: true,
        };
        if (win.webContents.navigationHistory.canGoBack()) {
            payload.back = true;
        }
        if (win.webContents.navigationHistory.canGoForward()) {
            payload.forward = true;
        }
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
        win.webContents.send("open-context-menu", payload);
        _event.preventDefault();
    });
    await ensureExternalFileExists();
}
function setupTray() {
    if (tray)
        return;
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
ipcMain.handle("db:get-data", (_event, key) => {
    // const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    // return row ? row.value : null;
});
ipcMain.handle("app:exitOrRestart", (_event, action) => {
    if (action === "exit") {
        app.quit();
    }
    else {
        app.relaunch();
        app.exit(0);
    }
});
ipcMain.handle("app:navigateHistory", (_event, action) => {
    if (!win)
        return;
    if (action === "back") {
        win.webContents.navigationHistory.goBack();
    }
    else {
        win.webContents.navigationHistory.goForward();
    }
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
    if (!options.icon) {
        options.icon = path.join(__dirname, "../public/favicon.ico");
    }
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
ipcMain.handle("db:sync", (_event) => {
    //sync db data if internet
});
ipcMain.handle("open-browser", (_event, url) => {
    shell.openExternal(url);
});
ipcMain.handle("notification", (_event, title, body) => {
    NotificationService.show(title, body);
});
process.on("uncaughtException", (error) => {
    log.error("Uncaught Exception", error);
    sendCrashReport(error, "uncaughtException");
});
process.on("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    log.error("Unhandled Promise Rejection", error);
    sendCrashReport(error, "unhandledRejection");
});
app.whenReady().then(() => {
    if (BrowserWindow.getAllWindows().length === 0 && win === null)
        createWindow();
    uploadPendingCrash().catch((e) => log.error("Failed to upload crash", e));
});
app.on("before-quit", () => {
    isAppQuitting = true;
    // closeDB();
});
app.on("will-quit", () => {
    // closeDB();
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
