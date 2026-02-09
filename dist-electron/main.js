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
let idleCheckInterval = null;
let queue = [];
let activeJob = null;
let jobHistory = [];
// Constants
const SESSION_EXPIRY_SECONDS = 60 * 60 * 24;
const IDLE_CHECK_INTERVAL_MS = 60 * 1000;
crashReporter.start({
    productName: "Staff Manager",
    companyName: "PPSMB",
    submitURL: "https://api.axiolot.com.ng/api/ppsmb/crash/native",
    uploadToServer: true,
    compress: true,
    ignoreSystemCrashHandler: false,
    extra: {
        version: app.getVersion(),
        platform: process.platform,
    },
});
async function uploadPendingCrash() {
    const crashFile = path.join(app.getPath("userData"), "ppsmb-crash", "crash-pending.json");
    if (!fs.existsSync(crashFile))
        return;
    try {
        const data = JSON.parse(fs.readFileSync(crashFile, "utf-8"));
        await axios.post("https://axiolot.com.ng/api/ppsmb/crash/json", data);
        fs.unlinkSync(crashFile);
    }
    catch (error) {
        log.warn("Failed to upload pending crash report", error);
    }
}
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
    catch (err) {
        console.error("Failed to save crash report:", err);
    }
}
function handleUserIdle() {
    if (!win || win.isDestroyed())
        return;
    win.webContents.send("idle");
}
async function processQueue() {
    if (activeJob || !queue.length)
        return;
    activeJob = queue.shift();
    sendProgress("printing", activeJob.id);
    const printerWin = new BrowserWindow({
        show: false,
        webPreferences: { sandbox: true },
    });
    const cleanup = (status) => {
        if (activeJob) {
            jobHistory.unshift({
                ...activeJob,
                status,
                finishedAt: Date.now().toLocaleString(),
            });
        }
        status && sendProgress(status, activeJob.id);
        printerWin.close();
        activeJob = null;
        processQueue();
    };
    try {
        await printerWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(activeJob.html)}`);
        printerWin.webContents.print({
            silent: activeJob.silent,
            printBackground: true,
            deviceName: activeJob.printer,
        }, async (success) => {
            if (!activeJob) {
                NotificationService.show("Printing Error", "Failed to print document. Please try again.");
                return printerWin.close();
            }
            if (activeJob.cancelled)
                return cleanup("cancelled");
            if (!success) {
                await exportPDF(activeJob.html, activeJob.name);
                return cleanup("pdf fallback");
            }
            cleanup("completed");
        });
    }
    catch {
        NotificationService.show("Printing Error", "Failed to print document. Please try again.");
        cleanup("failed");
    }
}
async function exportPDF(html, fileName) {
    const pdfWin = new BrowserWindow({ show: false });
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const pdf = await pdfWin.webContents.printToPDF({});
    // Ensure PDF directory exists
    const pdfDir = path.join(app.getPath("userData"), "pdfs");
    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
    }
    fs.writeFileSync(path.join(pdfDir, `${fileName}.pdf`), pdf);
    pdfWin.close();
}
function sendProgress(status, jobId) {
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send("print-progress", { status, jobId }));
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
    win.on("closed", () => {
        win = null;
    });
    setupTray();
    win.webContents.on("context-menu", (_event, params) => {
        if (!win || win.isDestroyed())
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
    tray.setToolTip("PPSMB Staff Manager");
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
ipcMain.handle("db:insert", async (_event, tableName, doc, incoming = false) => {
    try {
        const result = await dbManager.insert(tableName, doc, incoming);
        syncService.notifyDataChange();
        return result;
    }
    catch (error) {
        log.error(`IPC db:insert error in ${tableName}`, error);
        return false;
    }
});
ipcMain.handle("db:insertMany", async (_event, tableName, docs, incoming = false) => {
    try {
        const result = await dbManager.insertMany(tableName, docs, incoming);
        syncService.notifyDataChange();
        return result;
    }
    catch (error) {
        log.error(`IPC db:insertMany error in ${tableName}`, error);
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
ipcMain.handle("db:findMany", async (_event, tableName, query) => {
    try {
        return await dbManager.findMany(tableName, query);
    }
    catch (error) {
        log.error(`IPC db:findMany error in ${tableName}`, error);
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
        win?.hide();
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
ipcMain.handle("app:openModal", (_event, routeUrl, options) => {
    const allWindows = BrowserWindow.getAllWindows();
    const existingModal = allWindows.find((w) => w !== win && !w.isDestroyed());
    if (existingModal) {
        existingModal.focus();
        if (routeUrl.startsWith("http://") || routeUrl.startsWith("https://")) {
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
    if (routeUrl.startsWith("http://") || routeUrl.startsWith("https://")) {
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
        await syncService.syncNow({ canNotify: true });
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
ipcMain.handle("app:openBrowser", (_event, url) => {
    shell.openExternal(url);
});
ipcMain.handle("app:notification", (_event, title, body) => {
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
            expiresAt: SESSION_EXPIRY_SECONDS,
        });
        syncService.start();
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
ipcMain.handle("auth:login", (_event, user) => {
    storeHelper.setUser(user);
    storeHelper.setSession({
        token: user.token,
        expiresAt: SESSION_EXPIRY_SECONDS,
    });
    syncService.start();
    return true;
});
ipcMain.handle("auth:logout", (_event) => {
    storeHelper.clearUser();
    storeHelper.clearSession();
    syncService.stop();
    return true;
});
ipcMain.handle("store:clearUser", (_event) => {
    storeHelper.clearUser();
    return true;
});
ipcMain.handle("theme:getSystemTheme", () => {
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
});
ipcMain.handle("queue-print", (_event, job) => {
    queue.push(job);
    processQueue();
});
ipcMain.handle("cancel-print", (_event, jobId) => {
    queue = queue.filter((j) => j.id !== jobId);
    if (activeJob?.id === jobId) {
        activeJob.cancelled = true;
        sendProgress("cancelled", jobId);
    }
});
ipcMain.handle("reprint-job", (_e, jobId) => {
    const job = jobHistory.find((j) => j.id === jobId);
    if (!job)
        return;
    queue.unshift({
        ...job,
        cancelled: false,
    });
    processQueue();
});
ipcMain.handle("get-print-history", () => {
    return jobHistory;
});
ipcMain.handle("reorder-print", (_event, ids) => {
    queue = ids
        .map((id) => queue.find((j) => j.id === id))
        .filter((j) => Boolean(j));
    if (!activeJob)
        processQueue();
});
ipcMain.handle("get-printers", async () => {
    const activeWindow = BrowserWindow.getAllWindows()[0];
    if (!activeWindow) {
        log.warn("No active window found for getting printers");
        return [];
    }
    return activeWindow.webContents.getPrintersAsync();
});
ipcMain.handle("save-printer", (_event, printer) => {
    fs.writeFileSync(path.join(app.getPath("userData"), "printer.json"), JSON.stringify({ printer }));
});
ipcMain.handle("load-printer", () => {
    if (!fs.existsSync(path.join(app.getPath("userData"), "printer.json"))) {
        return null;
    }
    return JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "printer.json"), "utf8")).printer;
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
    if (win === null)
        createWindow();
    uploadPendingCrash().catch((e) => log.error("Failed to upload crash", e));
    // Clear any existing interval to prevent duplicates
    if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
    }
    idleCheckInterval = setInterval(() => {
        if (!win || win.isDestroyed())
            return;
        const lockTime = storeHelper.getSetting("lockScreen");
        const idleTime = powerMonitor.getSystemIdleTime();
        if (idleTime >= lockTime) {
            handleUserIdle();
        }
    }, IDLE_CHECK_INTERVAL_MS);
});
app.on("before-quit", () => {
    isAppQuitting = true;
    syncService.stop();
    // Clean up interval
    if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
        idleCheckInterval = null;
    }
    // Clean up tray
    if (tray) {
        tray.destroy();
        tray = null;
    }
});
app.on("will-quit", () => {
    // Database cleanup handled by dbManager
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
