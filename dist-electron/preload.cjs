"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const electron_1 = require("electron");
function on(channel, handler) {
    const listener = (_, ...args) => handler(...args);
    electron_1.ipcRenderer.on(channel, listener);
    return () => electron_1.ipcRenderer.removeListener(channel, listener);
}
const appBridge = {
    saveData: (item) => electron_1.ipcRenderer.invoke("db:save", item),
    getData: (key) => electron_1.ipcRenderer.invoke("db:get-data", key),
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
    openModal: (routeUrl, options) => electron_1.ipcRenderer.invoke("open-modal", routeUrl, options),
    openBrowser: (url) => electron_1.ipcRenderer.invoke("open-browser", url),
    //context-menu
    openContextMenu: (cb) => on("open-context-menu", cb),
};
electron_1.contextBridge.exposeInMainWorld("electronAPI", appBridge);
