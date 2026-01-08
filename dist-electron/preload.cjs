"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const appBridge = {
    saveData: (item) => electron_1.ipcRenderer.invoke("db:save", item),
    getData: (key) => electron_1.ipcRenderer.invoke("db:get-data", key),
    sendNotification: (title, body) => electron_1.ipcRenderer.send("notification", title, body),
    // Document Scanner
    onScanDocument: (callback) => {
        electron_1.ipcRenderer.on("scan-document", () => callback());
    },
    removeScanDocumentListener: () => {
        electron_1.ipcRenderer.removeAllListeners("scan-document");
    },
    // Updater
    startDownload: () => electron_1.ipcRenderer.send("start-download"),
    confirmInstall: () => electron_1.ipcRenderer.send("quit-and-install"),
    onUpdateAvailable: (callback) => electron_1.ipcRenderer.on("update-available", (_, version) => callback(version)),
    onUpdateProgress: (callback) => electron_1.ipcRenderer.on("update-progress", (_, percent) => callback(percent)),
    onUpdateDownloaded: (callback) => electron_1.ipcRenderer.on("update-downloaded", () => callback()),
};
electron_1.contextBridge.exposeInMainWorld("electronAPI", appBridge);
