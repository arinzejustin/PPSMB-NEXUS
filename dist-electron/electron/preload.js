import { contextBridge, ipcRenderer } from "electron";
const appBridge = {
    saveData: (item) => ipcRenderer.invoke("db:save", item),
    getData: (key) => ipcRenderer.invoke("db:get-data", key),
    sendNotification: (title, body) => ipcRenderer.send("notification", title, body),
    // Document Scanner
    onScanDocument: (callback) => {
        ipcRenderer.on("scan-document", () => callback());
    },
    removeScanDocumentListener: () => {
        ipcRenderer.removeAllListeners("scan-document");
    },
    // Updater
    startDownload: () => ipcRenderer.send("start-download"),
    confirmInstall: () => ipcRenderer.send("quit-and-install"),
    onUpdateAvailable: (callback) => ipcRenderer.on("update-available", (_, version) => callback(version)),
    onUpdateProgress: (callback) => ipcRenderer.on("update-progress", (_, percent) => callback(percent)),
    onUpdateDownloaded: (callback) => ipcRenderer.on("update-downloaded", () => callback()),
};
contextBridge.exposeInMainWorld("electronAPI", appBridge);
