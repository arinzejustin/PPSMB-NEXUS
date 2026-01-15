// @ts-ignore
import { contextBridge, ipcRenderer } from "electron";
import type { IElectronAPI, Unsubscribe } from "./types.js";

function on<T = unknown>(
  channel: string,
  handler: (data: T) => void
): Unsubscribe {
  const listener = (_event: unknown, data: T) => handler(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const appBridge: IElectronAPI = {
  // Database
  saveData: (item) => ipcRenderer.invoke("db:save", item),
  getData: (key) => ipcRenderer.invoke("db:get-data", key),
  syncRecords: () => ipcRenderer.invoke("db:sync"),

  // Notification
  sendNotification: (title, body) =>
    ipcRenderer.send("notification", title, body),

  // Document scanner
  onScanDocument: (cb) => on("scan-document", cb),

  // Updater
  startDownload: () => ipcRenderer.send("start-download"),
  confirmInstall: () => ipcRenderer.send("quit-and-install"),
  checkUpdate: () => ipcRenderer.send("check-for-updates"),
  onUpdateAvailable: (cb) => on<string>("update-available", cb),
  onUpdateProgress: (cb) => on<number>("update-progress", cb),
  onUpdateDownloaded: (cb) => on("update-downloaded", cb),
  getUpdateState: () => ipcRenderer.invoke("get-update-state"),

  // Window management
  openModal: (routeUrl, options) =>
    ipcRenderer.invoke("open-modal", routeUrl, options),
  openBrowser: (url) => ipcRenderer.invoke("open-browser", url),
  exitOrRestart: (action: "exit" | "restart") =>
    ipcRenderer.invoke("app:exitOrRestart", action),
  navigateHistory: (action: "back" | "forward") =>
    ipcRenderer.invoke("app:navigateHistory", action),

  // Context menu
  openContextMenu: (cb) =>
    on<Record<string, boolean | number | string>>("open-context-menu", cb),
};

try {
  contextBridge.exposeInMainWorld("electronAPI", appBridge);
} catch (error) {
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