"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const electron_1 = require("electron");
function on(channel, handler) {
    const listener = (_event, data) => handler(data);
    electron_1.ipcRenderer.on(channel, listener);
    return () => electron_1.ipcRenderer.removeListener(channel, listener);
}
const appBridge = {
    dbInsert: (tableName, doc, incoming = false) => electron_1.ipcRenderer.invoke("db:insert", tableName, doc, incoming),
    dbInsertMany: (tableName, docs, incoming = false) => electron_1.ipcRenderer.invoke("db:insertMany", tableName, docs, incoming),
    dbFind: (tableName, query, sort, limit, skip) => electron_1.ipcRenderer.invoke("db:find", tableName, query, sort, limit, skip),
    dbFindOne: (tableName, query) => electron_1.ipcRenderer.invoke("db:findOne", tableName, query),
    dbFindMany: (tableName, query) => electron_1.ipcRenderer.invoke("db:findMany", tableName, query),
    dbUpdate: (tableName, query, update, options) => electron_1.ipcRenderer.invoke("db:update", tableName, query, update, options),
    dbDelete: (tableName, query, options) => electron_1.ipcRenderer.invoke("db:delete", tableName, query, options),
    dbCount: (tableName, query) => electron_1.ipcRenderer.invoke("db:count", tableName, query),
    syncRecords: () => electron_1.ipcRenderer.invoke("db:sync"),
    //idle
    onIdle: (cb) => on("idle", cb),
    // from store
    getSetting: (key) => electron_1.ipcRenderer.invoke("store:getSetting", key),
    setSetting: (key, value) => electron_1.ipcRenderer.invoke("store:setSetting", key, value),
    get: (key) => electron_1.ipcRenderer.invoke("store:get", key),
    set: (key, value) => electron_1.ipcRenderer.invoke("store:set", key, value),
    getUser: () => electron_1.ipcRenderer.invoke("store:getUser"),
    clearUser: () => electron_1.ipcRenderer.invoke("store:clearUser"),
    // Legacy/Helpers
    saveData: (item) => electron_1.ipcRenderer.invoke("db:save", item),
    getData: (key) => electron_1.ipcRenderer.invoke("db:get-data", key),
    // Authentication
    verifyPin: (pin, uuid) => electron_1.ipcRenderer.invoke("auth:verify-pin", pin, uuid),
    authLogin: (user) => electron_1.ipcRenderer.invoke("auth:login", user),
    authLogout: () => electron_1.ipcRenderer.invoke("auth:logout"),
    // Notification
    sendNotification: (title, body) => electron_1.ipcRenderer.invoke("app:notification", title, body),
    // Document scanner
    onScanDocument: (cb) => on("scan-document", cb),
    // Updater
    startDownload: () => electron_1.ipcRenderer.send("start-download"),
    confirmInstall: () => electron_1.ipcRenderer.send("quit-and-install"),
    checkUpdate: () => electron_1.ipcRenderer.send("check-for-updates"),
    onUpdateAvailable: (cb) => on("update-available", cb),
    onUpdateProgress: (cb) => on("update-progress", cb),
    onUpdateDownloaded: (cb) => on("update-downloaded", cb),
    getUpdateState: () => electron_1.ipcRenderer.invoke("get-update-state"),
    // Window management
    openModal: (routeUrl, options) => electron_1.ipcRenderer.invoke("app:openModal", routeUrl, options),
    openBrowser: (url) => electron_1.ipcRenderer.invoke("app:openBrowser", url),
    getNitroPort: () => electron_1.ipcRenderer.invoke("app:getNitroPort"),
    exitOrRestart: (action) => electron_1.ipcRenderer.invoke("app:exitOrRestart", action),
    navigateHistory: (action) => electron_1.ipcRenderer.invoke("app:navigateHistory", action),
    // Context menu
    openContextMenu: (cb) => on("open-context-menu", cb),
    // Theme
    getSystemTheme: () => electron_1.ipcRenderer.invoke("theme:getSystemTheme"),
    onSystemThemeChange: (callback) => {
        electron_1.ipcRenderer.on("theme:system-changed", (_event, theme) => callback(theme));
        return () => {
            electron_1.ipcRenderer.removeAllListeners("theme:system-changed");
        };
    },
    // Sync
    onSyncStatusUpdate: (cb) => on("sync-status-update", cb),
    // Database change notifications
    onDatabaseChange: (cb) => on("database-change", cb),
    //Printer
    queuePrint: (job) => electron_1.ipcRenderer.invoke("queue-print", job),
    cancelPrint: (id) => electron_1.ipcRenderer.invoke("cancel-print", id),
    reorderPrint: (ids) => electron_1.ipcRenderer.invoke("reorder-print", ids),
    getPrinters: () => electron_1.ipcRenderer.invoke("get-printers"),
    savePrinter: (printer) => electron_1.ipcRenderer.invoke("save-printer", printer),
    loadPrinter: () => electron_1.ipcRenderer.invoke("load-printer"),
    onPrintProgress(cb) {
        const listener = (_, data) => {
            cb(data);
        };
        electron_1.ipcRenderer.on("print-progress", listener);
        return () => {
            electron_1.ipcRenderer.removeListener("print-progress", listener);
        };
    },
    reprintJob: (jobId) => electron_1.ipcRenderer.invoke("reprint-job", jobId),
    getPrintHistory: () => electron_1.ipcRenderer.invoke("get-print-history"),
};
try {
    electron_1.contextBridge.exposeInMainWorld("electronAPI", appBridge);
}
catch (error) {
    console.error("Failed to expose Electron API:", error);
}
