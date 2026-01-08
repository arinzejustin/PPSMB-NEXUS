import { contextBridge, ipcRenderer } from "electron";
import type { IElectronAPI } from "./types.js";

const appBridge: IElectronAPI = {
  saveData: (item) => ipcRenderer.invoke("db:save", item),
  getData: (key) => ipcRenderer.invoke("db:get-data", key),
  sendNotification: (title, body) =>
    ipcRenderer.send("notification", title, body),

  // Document Scanner
  onScanDocument: (callback: () => void) => {
    ipcRenderer.on("scan-document", () => callback());
  },
  removeScanDocumentListener: () => {
    ipcRenderer.removeAllListeners("scan-document");
  },

  // Updater
  startDownload: () => ipcRenderer.send("start-download"),
  confirmInstall: () => ipcRenderer.send("quit-and-install"),

  onUpdateAvailable: (callback: (version: string) => void) =>
    ipcRenderer.on("update-available", (_, version) => callback(version)),

  onUpdateProgress: (callback: (percent: number) => void) =>
    ipcRenderer.on("update-progress", (_, percent) => callback(percent)),

  onUpdateDownloaded: (callback: () => void) =>
    ipcRenderer.on("update-downloaded", () => callback()),
};

contextBridge.exposeInMainWorld("electronAPI", appBridge);
