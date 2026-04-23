import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, crashReporter, powerMonitor, nativeTheme, } from "electron";
import { fork } from "child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import axios from "axios";
import { NotificationService } from "./utils/notification.js";
import { setupAutoUpdater } from "./utils/updater.js";
import log from "./utils/logger.js";
import { ensureExternalFileExists } from "./utils/downloadScanner.js";
import { dbManager } from "./database/app.db.js";
import { syncService } from "./database/sync.db.js";
import { storeHelper } from "./store/store.js";
import { scannerClient } from "./utils/scannerClient.js";
// ─── Constants & Paths ───────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_EXPIRY_SECONDS = 60 * 60 * 24;
const IDLE_CHECK_INTERVAL_MS = 60 * 1000;
const WINDOW_SHOW_TIMEOUT_MS = 30_000;
const PDF_RENDER_DELAY_MS = 10_000;
const PRINTER_CONFIG_PATH = () => path.join(app.getPath("userData"), "printer.json");
const CRASH_DIR = () => path.join(app.getPath("userData"), "ppsmb-crash");
const PDF_DIR = () => path.join(app.getPath("userData"), "pdfs");
const ICON_PATH = () => path.join(__dirname, "../public/favicon.ico");
const PRELOAD_PATH = () => path.join(__dirname, "preload.cjs");
// ─── App State ───────────────────────────────────────────────────────────────
let win = null;
let tray = null;
let nitroProcess = null;
let isAppQuitting = false;
let idleCheckInterval = null;
let queue = [];
let activeJob = null;
let jobHistory = [];
let nitroPort = 0;
// ─── Single Instance Lock ────────────────────────────────────────────────────
app.setAppUserModelId("PPSMB Enugu Nexus");
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
}
else {
    app.on("second-instance", () => {
        if (win) {
            if (win.isMinimized())
                win.restore();
            win.show();
            win.focus();
        }
    });
}
// ─── Crash Reporting ─────────────────────────────────────────────────────────
crashReporter.start({
    productName: "PPSMB Enugu Nexus",
    companyName: "Axiolot Hub",
    submitURL: "https://api.axiolot.com.ng/ppsmb-enugu/crash/native",
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
        const crashDir = CRASH_DIR();
        if (!fs.existsSync(crashDir)) {
            fs.mkdirSync(crashDir, { recursive: true });
        }
        fs.writeFileSync(path.join(crashDir, "crash-pending.json"), JSON.stringify({
            origin,
            message: error.message,
            stack: error.stack,
            version: app.getVersion(),
            platform: process.platform,
            time: new Date().toISOString(),
            release: os.release(),
        }, null, 2));
    }
    catch (err) {
        log.error("Failed to save crash report", err);
    }
}
async function uploadPendingCrash() {
    const crashFile = path.join(CRASH_DIR(), "crash-pending.json");
    if (!fs.existsSync(crashFile))
        return;
    try {
        const data = JSON.parse(fs.readFileSync(crashFile, "utf-8"));
        await axios.post("https://api.axiolot.com.ng/ppsmb-enugu/crash/report", data);
        fs.unlinkSync(crashFile);
    }
    catch (error) {
        log.warn("Failed to upload pending crash report", error);
    }
}
// ─── Server Utilities ────────────────────────────────────────────────────────
function waitForServer(port, timeout = 10_000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            const req = net.createConnection({ port, host: "localhost" }, () => {
                req.destroy();
                resolve();
            });
            req.on("error", () => {
                if (Date.now() - start > timeout) {
                    reject(new Error(`Nitro server didn't start within ${timeout}ms`));
                }
                else {
                    setTimeout(check, 200);
                }
            });
        };
        check();
    });
}
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
            server.close(() => resolve(true));
        });
        server.listen(port, "localhost");
    });
}
/**
 * Scans uncommon high ports (49152-65535, the IANA dynamic/private range)
 * to find one that is not in use. Starts from a random offset to avoid
 * always picking the same port on different machines.
 */
async function findUncommonPort() {
    const MIN_PORT = 49152;
    const MAX_PORT = 65535;
    const range = MAX_PORT - MIN_PORT + 1;
    // Start from a pseudo-random offset so different installs pick different ports
    const startOffset = Math.floor(Math.random() * range);
    for (let i = 0; i < range; i++) {
        const port = MIN_PORT + ((startOffset + i) % range);
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    throw new Error("No available port found in the dynamic port range (49152-65535)");
}
async function startNitro() {
    let port;
    const storedPort = storeHelper.get("nitroPort");
    if (storedPort) {
        // Try the previously saved port first
        const available = await isPortAvailable(storedPort);
        if (available) {
            port = storedPort;
            log.info(`Reusing stored Nitro port ${port}`);
        }
        else {
            // Stored port is occupied — find a new one
            log.warn(`Stored port ${storedPort} is in use, searching for a new port...`);
            port = await findUncommonPort();
            storeHelper.set("nitroPort", port);
            log.info(`Switched to new Nitro port ${port}`);
        }
    }
    else {
        // First-ever launch — find an uncommon available port
        port = await findUncommonPort();
        storeHelper.set("nitroPort", port);
        log.info(`First launch: selected Nitro port ${port}`);
    }
    let serverPath = path.join(__dirname, "../.output/server/index.mjs");
    if (app.isPackaged) {
        serverPath = serverPath.replace("app.asar", "app.asar.unpacked");
    }
    const serverEnv = {};
    nitroProcess = fork(serverPath, {
        env: {
            ...process.env,
            ...serverEnv,
            PORT: String(port),
            NITRO_PORT: String(port),
            NITRO_HOST: "localhost",
            NODE_ENV: "production",
        },
        stdio: ["ignore", "pipe", "pipe", "ipc"],
    });
    nitroProcess.stdout?.on("data", (data) => log.info(`[Nitro]: ${data.toString()}`));
    nitroProcess.stderr?.on("data", (data) => log.error(`[Nitro Error]: ${data.toString()}`));
    await waitForServer(port);
    nitroPort = port;
    log.info(`Nitro server started on port ${port}`);
    return port;
}
// ─── Print Queue ─────────────────────────────────────────────────────────────
function sendProgress(status, jobId) {
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send("print-progress", { status, jobId }));
}
async function exportPDF(html, fileName) {
    const pdfWin = new BrowserWindow({ show: false });
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise((resolve) => setTimeout(resolve, PDF_RENDER_DELAY_MS));
    const pdf = await pdfWin.webContents.printToPDF({});
    const pdfDir = PDF_DIR();
    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
    }
    fs.writeFileSync(path.join(pdfDir, `${fileName}.pdf`), pdf);
    pdfWin.close();
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
        if (status)
            sendProgress(status, activeJob.id);
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
                printerWin.close();
                return;
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
// ─── Window Helpers ──────────────────────────────────────────────────────────
function maximizeAndShow(window) {
    if (process.platform === "win32" || process.platform === "linux") {
        window.maximize();
    }
    window.show();
    window.focus();
}
function loadRoute(window, url) {
    if (url.startsWith("http://") || url.startsWith("https://")) {
        window.loadURL(url);
    }
    else {
        window.loadFile(url);
    }
}
function handleUserIdle() {
    if (!win || win.isDestroyed())
        return;
    win.webContents.send("idle");
}
// ─── Main Window ─────────────────────────────────────────────────────────────
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
        minWidth: 400,
        minHeight: 300,
        show: false,
        backgroundColor: "#008435",
        icon: ICON_PATH(),
        webPreferences: {
            preload: PRELOAD_PATH(),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    win.setMenuBarVisibility(false);
    setupAutoUpdater(win);
    syncService.start();
    const showTimeout = setTimeout(() => {
        if (win && !win.isDestroyed() && !win.isVisible()) {
            maximizeAndShow(win);
        }
    }, WINDOW_SHOW_TIMEOUT_MS);
    win.once("ready-to-show", () => {
        clearTimeout(showTimeout);
        if (!win)
            return;
        // maximizeAndShow(win);
    });
    win.webContents.once("did-finish-load", () => {
        win.webContents.executeJavaScript(`window.__appVersion = "${app.getVersion()}"`);
    });
    if (!app.isPackaged) {
        win.loadURL("http://localhost:3000");
    }
    else {
        const storedPort = storeHelper.get("nitroPort");
        let needsPortRecovery = false;
        if (storedPort) {
            const available = await isPortAvailable(storedPort);
            if (!available) {
                needsPortRecovery = true;
                log.warn(`Stored port ${storedPort} is occupied, showing recovery page...`);
            }
        }
        if (needsPortRecovery && win && !win.isDestroyed()) {
            await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
          <html>
            <head>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background: linear-gradient(135deg, #006b2b 0%, #008435 50%, #00a643 100%);
                  color: #fff;
                  flex-direction: column;
                  gap: 24px;
                  overflow: hidden;
                }
                .spinner {
                  width: 48px;
                  height: 48px;
                  border: 4px solid rgba(255,255,255,0.2);
                  border-top-color: #fff;
                  border-radius: 50%;
                  animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
                h1 {
                  font-size: 24px;
                  font-weight: 600;
                  letter-spacing: -0.5px;
                }
                p {
                  font-size: 14px;
                  opacity: 0.85;
                  max-width: 400px;
                  text-align: center;
                  line-height: 1.5;
                }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <h1>Updating Server</h1>
              <p>The previous server port is in use by another application. Finding a new available port&hellip;</p>
            </body>
          </html>
        `)}`);
        }
        try {
            const port = await startNitro();
            if (win && !win.isDestroyed()) {
                await win.loadURL(`http://localhost:${port}`);
            }
        }
        catch (err) {
            log.error("Nitro failed to start", err);
            if (win && !win.isDestroyed()) {
                await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
            <html>
              <body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#008435;color:#fff;flex-direction:column">
                <h1>Failed to Start</h1>
                <p>The application server could not be started. Please try restarting the app.</p>
                <p style="font-size:12px;opacity:0.7">${err instanceof Error ? err.message : String(err)}</p>
                <button style="background:#fff;color:#008435;border:1px solid #008435;padding:10px 20px;cursor:pointer" onclick="window.open('https://axiolot.com.ng/contact?subject=PPSMB Enugu Nexus Error&body=${encodeURIComponent(String(err))}')">Contact The Support Team</button>
              </body>
            </html>
          `)}`);
            }
        }
    }
    win.on("close", (event) => {
        if (!isAppQuitting && win) {
            event.preventDefault();
            win.hide();
        }
    });
    win.on("closed", () => {
        win = null;
    });
    setupTray();
    setupContextMenu();
    const scanner = await ensureExternalFileExists(app);
    if (scanner) {
        NotificationService.show(scanner.title, scanner.message);
    }
}
// ─── Context Menu ────────────────────────────────────────────────────────────
function setupContextMenu() {
    if (!win)
        return;
    win.webContents.on("context-menu", (event, params) => {
        if (!win || win.isDestroyed())
            return;
        const payload = {
            exit: true,
            version: true,
            __version: app.getVersion(),
            check: true,
            release: `https://axiolot.com.ng/apps/ppsmb-enugu-nexus?release=${app.getVersion()}`,
            copyVersion: true,
            restart: true,
        };
        if (win.webContents.navigationHistory.canGoBack())
            payload.back = true;
        if (win.webContents.navigationHistory.canGoForward())
            payload.forward = true;
        if (params.isEditable) {
            payload.cut = true;
            payload.copy = true;
            payload.paste = true;
        }
        if (params.selectionText)
            payload.copy = true;
        if (params.linkURL) {
            payload.openLink = true;
            payload.linkUrl = params.linkURL;
        }
        payload.x = params.x;
        payload.y = params.y;
        win.webContents.send("open-context-menu", payload);
        event.preventDefault();
    });
}
// ─── System Tray ─────────────────────────────────────────────────────────────
function setupTray() {
    if (tray)
        return;
    const image = nativeImage.createFromPath(ICON_PATH());
    if (image.isEmpty()) {
        log.error("Failed to load tray icon");
    }
    tray = new Tray(image);
    tray.setToolTip("PPSMB Enugu Nexus");
    tray.setContextMenu(Menu.buildFromTemplate([
        {
            label: "Open App",
            click: () => win?.show(),
        },
        {
            label: "Sync Now",
            click: () => {
                win?.webContents.send("sync-now");
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
    ]));
    tray.on("click", () => {
        win?.isVisible() ? win.hide() : win?.show();
    });
}
// ─── IPC: Database Operations ────────────────────────────────────────────────
ipcMain.handle("db:insert", async (_, tableName, doc, incoming = false) => {
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
ipcMain.handle("db:insertMany", async (_, tableName, docs, incoming = false) => {
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
ipcMain.handle("db:find", async (_, tableName, query, sort, limit, skip) => {
    try {
        return await dbManager.find(tableName, query, sort, limit, skip);
    }
    catch (error) {
        log.error(`IPC db:find error in ${tableName}`, error);
        throw error;
    }
});
ipcMain.handle("db:findOne", async (_, tableName, query) => {
    try {
        return await dbManager.findOne(tableName, query);
    }
    catch (error) {
        log.error(`IPC db:findOne error in ${tableName}`, error);
        throw error;
    }
});
ipcMain.handle("db:findMany", async (_, tableName, query) => {
    try {
        return await dbManager.findMany(tableName, query);
    }
    catch (error) {
        log.error(`IPC db:findMany error in ${tableName}`, error);
        throw error;
    }
});
ipcMain.handle("db:update", async (_, tableName, query, update, options) => {
    try {
        const result = await dbManager.update(tableName, query, update, options);
        syncService.notifyDataChange();
        return result;
    }
    catch (error) {
        log.error(`IPC db:update error in ${tableName}`, error);
        throw error;
    }
});
ipcMain.handle("db:delete", async (_, tableName, query, options) => {
    try {
        const result = await dbManager.delete(tableName, query, options);
        syncService.notifyDataChange();
        return result;
    }
    catch (error) {
        log.error(`IPC db:delete error in ${tableName}`, error);
        throw error;
    }
});
ipcMain.handle("db:count", async (_, tableName, query) => {
    try {
        return await dbManager.count(tableName, query);
    }
    catch (error) {
        log.error(`IPC db:count error in ${tableName}`, error);
        throw error;
    }
});
ipcMain.handle("db:get-data", (_, key) => storeHelper.get(key));
ipcMain.handle("db:save", (_, item) => {
    if (item?.key && item.value !== undefined) {
        storeHelper.set(item.key, item.value);
        return;
    }
    log.warn("IPC db:save called with unknown format", item);
});
ipcMain.handle("db:sync", async () => {
    try {
        await syncService.syncNow({ canNotify: true });
        return { success: true };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// ─── IPC: Store Operations ───────────────────────────────────────────────────
ipcMain.handle("store:getSetting", (_, key) => storeHelper.getSetting(key));
ipcMain.handle("store:setSetting", (_, key, value) => {
    storeHelper.setSetting(key, value);
    if (key === "theme") {
        nativeTheme.themeSource = value;
    }
    return true;
});
ipcMain.handle("store:get", (_, key) => storeHelper.get(key));
ipcMain.handle("store:set", (_, key, value) => {
    storeHelper.set(key, value);
    return true;
});
ipcMain.handle("store:getUser", () => storeHelper.getUser());
ipcMain.handle("store:clearUser", () => {
    storeHelper.clearUser();
    return true;
});
// ─── IPC: Auth ───────────────────────────────────────────────────────────────
ipcMain.handle("auth:verify-pin", async (_, pin, uuid) => {
    const res = await dbManager.findOne("users", {
        uuid,
    });
    if (!res || res.pin !== pin)
        return null;
    const data = { ...res, pin: undefined };
    storeHelper.setUser(data);
    storeHelper.setSession({
        token: res.token,
        expiresAt: SESSION_EXPIRY_SECONDS,
    });
    syncService.start();
    return data;
});
ipcMain.handle("auth:login", (_, user) => {
    storeHelper.setUser(user);
    storeHelper.setSession({
        token: user.token,
        expiresAt: SESSION_EXPIRY_SECONDS,
    });
    syncService.start();
    return true;
});
ipcMain.handle("auth:logout", () => {
    storeHelper.clearUser();
    storeHelper.clearSession();
    syncService.stop();
    return true;
});
// ─── IPC: App Actions ────────────────────────────────────────────────────────
ipcMain.handle("app:exitOrRestart", (_, action) => {
    if (action === "exit") {
        win?.hide();
    }
    else {
        app.relaunch();
        app.exit(0);
    }
});
ipcMain.handle("app:navigateHistory", (_, action) => {
    if (!win)
        return;
    action === "back"
        ? win.webContents.navigationHistory.goBack()
        : win.webContents.navigationHistory.goForward();
});
ipcMain.handle("app:openModal", (_, routeUrl, options) => {
    const existingModal = BrowserWindow.getAllWindows().find((w) => w !== win && !w.isDestroyed());
    if (existingModal) {
        existingModal.focus();
        loadRoute(existingModal, routeUrl);
        return;
    }
    const modal = new BrowserWindow({
        parent: win,
        modal: true,
        width: options.width || 800,
        height: options.height || 600,
        show: false,
        autoHideMenuBar: true,
        icon: options.icon || ICON_PATH(),
        webPreferences: {
            preload: PRELOAD_PATH(),
            contextIsolation: true,
        },
        ...options,
    });
    modal.setMenuBarVisibility(false);
    loadRoute(modal, routeUrl);
    modal.once("ready-to-show", () => {
        modal.show();
        modal.focus();
    });
});
ipcMain.handle("app:openBrowser", (_, url) => shell.openExternal(url));
ipcMain.handle("app:getNitroPort", () => nitroPort);
ipcMain.handle("app:notification", (_, title, body) => {
    NotificationService.show(title, body);
});
// ─── IPC: Theme ──────────────────────────────────────────────────────────────
ipcMain.handle("theme:getSystemTheme", () => nativeTheme.shouldUseDarkColors ? "dark" : "light");
// ─── IPC: Print Queue ────────────────────────────────────────────────────────
ipcMain.handle("queue-print", (_, job) => {
    queue.push(job);
    processQueue();
});
ipcMain.handle("cancel-print", (_, jobId) => {
    queue = queue.filter((j) => j.id !== jobId);
    if (activeJob?.id === jobId) {
        activeJob.cancelled = true;
        sendProgress("cancelled", jobId);
    }
});
ipcMain.handle("reprint-job", (_, jobId) => {
    const job = jobHistory.find((j) => j.id === jobId);
    if (!job)
        return;
    queue.unshift({ ...job, cancelled: false });
    processQueue();
});
ipcMain.handle("get-print-history", () => jobHistory);
ipcMain.handle("reorder-print", (_, ids) => {
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
ipcMain.handle("save-printer", (_, printer) => {
    fs.writeFileSync(PRINTER_CONFIG_PATH(), JSON.stringify({ printer }));
});
ipcMain.handle("load-printer", () => {
    const configPath = PRINTER_CONFIG_PATH();
    if (!fs.existsSync(configPath))
        return null;
    return JSON.parse(fs.readFileSync(configPath, "utf8")).printer;
});
// ─── IPC: Scanner ────────────────────────────────────────────────────────────
ipcMain.handle("scanner:get-devices", async () => {
    try {
        const result = await scannerClient.sendCommand("LIST_DEVICES");
        return result.data;
    }
    catch (error) {
        return { error: error.message };
    }
});
ipcMain.handle("scanner:scan", async (_, format = "png") => {
    try {
        const result = await scannerClient.sendCommand("SCAN", { format });
        return result.path;
    }
    catch (error) {
        return { error: error.message };
    }
});
ipcMain.handle("scanner:scan-silent", async (_, format = "png", deviceId = "") => {
    try {
        const result = await scannerClient.sendCommand("SCAN_SILENT", {
            format,
            device_id: deviceId,
        });
        return result.path;
    }
    catch (error) {
        return { error: error.message };
    }
});
// ─── Process Error Handlers ──────────────────────────────────────────────────
process.on("uncaughtException", (error) => {
    log.error("Uncaught Exception", error);
    sendCrashReport(error, "uncaughtException");
});
process.on("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    log.error("Unhandled Promise Rejection", error);
    sendCrashReport(error, "unhandledRejection");
});
// ─── Native Theme ────────────────────────────────────────────────────────────
nativeTheme.on("updated", () => {
    if (storeHelper.getSetting("theme") !== "system")
        return;
    const resolvedTheme = nativeTheme.shouldUseDarkColors ? "dark" : "light";
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send("theme:system-changed", resolvedTheme));
});
// ─── App Lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
    if (win === null)
        createWindow();
    uploadPendingCrash().catch((e) => log.error("Failed to upload crash", e));
    if (idleCheckInterval)
        clearInterval(idleCheckInterval);
    idleCheckInterval = setInterval(() => {
        if (!win || win.isDestroyed())
            return;
        const lockTime = storeHelper.getSetting("lockScreen");
        const idleTime = powerMonitor.getSystemIdleTime();
        if (idleTime >= lockTime)
            handleUserIdle();
    }, IDLE_CHECK_INTERVAL_MS);
});
app.on("before-quit", () => {
    isAppQuitting = true;
    syncService.stop();
    if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
        idleCheckInterval = null;
    }
    if (tray) {
        tray.destroy();
        tray = null;
    }
    if (nitroProcess) {
        nitroProcess.kill();
        nitroProcess = null;
    }
    scannerClient
        .sendCommand("CLEANUP", { max_age_hours: "24" })
        .catch((err) => log.error("Scanner cleanup error", err))
        .finally(() => scannerClient.kill());
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        app.quit();
});
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && win === null) {
        createWindow();
    }
});
