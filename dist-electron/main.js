import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, crashReporter, powerMonitor, nativeTheme, } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import axios from "axios";
import { NotificationService } from "./utils/notification.js";
import { setupAutoUpdater } from "./utils/updater.js";
import log from "./utils/logger.js";
import { ensureExternalFileExists } from "./utils/downloadScanner.js";
import { dbManager } from "./database/app.db.js";
import { syncService } from "./database/sync.db.js";
import { storeHelper } from "./store/store.js";
app.setAppUserModelId("PPSMB Staff Manager");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let win = null;
let tray = null;
let isAppQuitting = false;
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
function handleUserIdle() {
    if (!win)
        return;
    win.webContents.send("idle");
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
        show: false,
        backgroundColor: "#008435",
    });
    win.setMenuBarVisibility(false);
    setupAutoUpdater(win);
    syncService.start();
    const isDev = !app.isPackaged;
    if (isDev) {
        win.loadURL("http://localhost:3000");
    }
    else {
        win.loadFile(path.join(__dirname, "../.output/public/index.html"));
    }
    win.once("ready-to-show", () => {
        if (!win)
            return;
        win.maximize();
        win.show();
        win.focus();
    });
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
    const scanner = await ensureExternalFileExists(app);
    if (scanner) {
        if (scanner.status)
            NotificationService.show(scanner.title, scanner.message);
        else
            NotificationService.show(scanner.title, scanner.message);
    }
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
ipcMain.handle("db:insert", async (_event, tableName, doc) => {
    try {
        const result = await dbManager.insert(tableName, doc);
        // Notify sync service of data change
        syncService.notifyDataChange();
        return result;
    }
    catch (error) {
        log.error(`IPC db:insert error in ${tableName}`, error);
        return false;
    }
});
ipcMain.handle("db:find", async (_event, tableName, query, sort, limit, skip) => {
    try {
        return await dbManager.find(tableName, query, sort, limit, skip);
    }
    catch (error) {
        log.error(`IPC db:find error in ${tableName}`, error);
        throw error;
    }
});
ipcMain.handle("db:findOne", async (_event, tableName, query) => {
    try {
        return await dbManager.findOne(tableName, query);
    }
    catch (error) {
        log.error(`IPC db:findOne error in ${tableName}`, error);
        throw error;
    }
});
ipcMain.handle("db:update", async (_event, tableName, query, update, options) => {
    try {
        const result = await dbManager.update(tableName, query, update, options);
        // Notify sync service of data change
        syncService.notifyDataChange();
        return result;
    }
    catch (error) {
        log.error(`IPC db:update error in ${tableName}`, error);
        throw error;
    }
});
ipcMain.handle("db:delete", async (_event, tableName, query, options) => {
    try {
        const result = await dbManager.delete(tableName, query, options);
        // Notify sync service of data change
        syncService.notifyDataChange();
        return result;
    }
    catch (error) {
        log.error(`IPC db:delete error in ${tableName}`, error);
        throw error;
    }
});
ipcMain.handle("db:count", async (_event, tableName, query) => {
    try {
        return await dbManager.count(tableName, query);
    }
    catch (error) {
        log.error(`IPC db:count error in ${tableName}`, error);
        throw error;
    }
});
ipcMain.handle("db:get-data", (_event, key) => {
    return storeHelper.get(key);
});
ipcMain.handle("db:save", (_event, item) => {
    if (item && item.key && item.value !== undefined) {
        storeHelper.set(item.key, item.value);
        return;
    }
    log.warn("IPC db:save called with unknown format", item);
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
        modal.focus();
    });
});
ipcMain.handle("db:sync", async (_event) => {
    try {
        await syncService.syncNow();
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
ipcMain.handle("open-browser", (_event, url) => {
    shell.openExternal(url);
});
ipcMain.handle("notification", (_event, title, body) => {
    NotificationService.show(title, body);
});
ipcMain.handle("auth:verify-pin", async (_event, pin, uuid) => {
    const res = await dbManager.findOne("users", {
        uuid,
    });
    if (!res)
        return null;
    if (res.pin === pin) {
        const data = {
            ...res,
            pin: undefined,
        };
        storeHelper.setUser(data);
        storeHelper.setSession({
            token: res.token,
            expiresAt: 60 * 60 * 24,
        });
        return data;
    }
    return null;
});
ipcMain.handle("store:getSetting", (_event, key) => {
    return storeHelper.getSetting(key);
});
ipcMain.handle("store:setSetting", (_event, key, value) => {
    storeHelper.setSetting(key, value);
    if (key === "theme") {
        const theme = value;
        nativeTheme.themeSource = theme;
    }
    return true;
});
ipcMain.handle("store:get", (_event, key) => {
    return storeHelper.get(key);
});
ipcMain.handle("store:set", (_event, key, value) => {
    storeHelper.set(key, value);
    return true;
});
ipcMain.handle("store:getUser", (_event) => {
    return storeHelper.getUser();
});
ipcMain.handle("store:clearUser", (_event) => {
    storeHelper.clearUser();
    return true;
});
ipcMain.handle("theme:getSystemTheme", () => {
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
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
nativeTheme.on("updated", () => {
    const theme = storeHelper.getSetting("theme");
    if (theme === "system") {
        BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send("theme:system-changed", nativeTheme.shouldUseDarkColors ? "dark" : "light");
        });
    }
});
app.whenReady().then(() => {
    if (BrowserWindow.getAllWindows().length === 0 && win === null)
        createWindow();
    uploadPendingCrash().catch((e) => log.error("Failed to upload crash", e));
    setInterval(() => {
        const lockTime = storeHelper.getSetting("lockScreen");
        const idleTime = powerMonitor.getSystemIdleTime();
        if (idleTime >= lockTime) {
            handleUserIdle();
        }
    }, 60 * 1000);
});
app.on("before-quit", () => {
    isAppQuitting = true;
    syncService.stop();
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
