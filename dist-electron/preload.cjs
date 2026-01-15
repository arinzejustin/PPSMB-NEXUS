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
    // Database
    saveData: (item) => electron_1.ipcRenderer.invoke("db:save", item),
    getData: (key) => electron_1.ipcRenderer.invoke("db:get-data", key),
    syncRecords: () => electron_1.ipcRenderer.invoke("db:sync"),
    // Notification
    sendNotification: (title, body) => electron_1.ipcRenderer.send("notification", title, body),
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
    openModal: (routeUrl, options) => electron_1.ipcRenderer.invoke("open-modal", routeUrl, options),
    openBrowser: (url) => electron_1.ipcRenderer.invoke("open-browser", url),
    exitOrRestart: (action) => electron_1.ipcRenderer.invoke("app:exitOrRestart", action),
    navigateHistory: (action) => electron_1.ipcRenderer.invoke("app:navigateHistory", action),
    // Context menu
    openContextMenu: (cb) => on("open-context-menu", cb),
};
try {
    electron_1.contextBridge.exposeInMainWorld("electronAPI", appBridge);
}
catch (error) {
    console.error("Failed to expose Electron API:", error);
}
// // Global error handler
// addEventListener("error", (event) => {
//   ipcRenderer.send("renderer-crash", {
//     message: event.message,
//     stack: event.error?.stack,
//     filename: event.filename,
//     lineno: event.lineno,
//     colno: event.colno,
//   });
// });
