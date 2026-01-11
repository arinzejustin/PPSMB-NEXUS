// @ts-ignore
import { contextBridge, ipcRenderer } from "electron";
import type { IElectronAPI, Unsubscribe } from "./types.js";

function on<T>(channel: string, handler: (...args: T[]) => void): Unsubscribe {
  const listener = (_: unknown, ...args: T[]) => handler(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const appBridge: IElectronAPI = {
  saveData: (item) => ipcRenderer.invoke("db:save", item),
  getData: (key) => ipcRenderer.invoke("db:get-data", key),

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

  openModal: (routeUrl, options) =>
    ipcRenderer.invoke("open-modal", routeUrl, options),

  openBrowser: (url) => ipcRenderer.invoke("open-browser", url),

  //context-menu
  openContextMenu: (cb) =>
    on<Record<string, boolean | number | string>>("open-context-menu", cb),
};

contextBridge.exposeInMainWorld("electronAPI", appBridge);
