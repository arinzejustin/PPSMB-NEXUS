// @ts-ignore
import { contextBridge, ipcRenderer } from "electron";
import type { IElectronAPI, Unsubscribe, UserDetails, Auth } from "./types.js";

function on<T = unknown>(
  channel: string,
  handler: (data: T) => void,
): Unsubscribe {
  const listener = (_event: unknown, data: T) => handler(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const appBridge: IElectronAPI = {
  dbInsert: (tableName, doc, incoming = false) =>
    ipcRenderer.invoke("db:insert", tableName, doc, incoming),
  dbInsertMany: (tableName, docs, incoming = false) =>
    ipcRenderer.invoke("db:insertMany", tableName, docs, incoming),
  dbFind: (tableName, query, sort, limit, skip) =>
    ipcRenderer.invoke("db:find", tableName, query, sort, limit, skip),
  dbFindOne: (tableName, query) =>
    ipcRenderer.invoke("db:findOne", tableName, query),
  dbFindMany: (tableName, query) =>
    ipcRenderer.invoke("db:findMany", tableName, query),
  dbUpdate: (tableName, query, update, options) =>
    ipcRenderer.invoke("db:update", tableName, query, update, options),
  dbDelete: (tableName, query, options) =>
    ipcRenderer.invoke("db:delete", tableName, query, options),
  dbCount: (tableName, query) =>
    ipcRenderer.invoke("db:count", tableName, query),
  syncRecords: () => ipcRenderer.invoke("db:sync"),

  //idle
  onIdle: (cb) => on("idle", cb),

  // from store
  getSetting: (key: string) => ipcRenderer.invoke("store:getSetting", key),
  setSetting: (key: string, value: any) =>
    ipcRenderer.invoke("store:setSetting", key, value),
  get: (key: string) => ipcRenderer.invoke("store:get", key),
  set: (key: string, value: any) => ipcRenderer.invoke("store:set", key, value),
  getUser: () => ipcRenderer.invoke("store:getUser"),
  clearUser: () => ipcRenderer.invoke("store:clearUser"),

  // Legacy/Helpers
  saveData: (item) => ipcRenderer.invoke("db:save", item),
  getData: (key) => ipcRenderer.invoke("db:get-data", key),

  // Authentication
  verifyPin: (pin: string, uuid: string) =>
    ipcRenderer.invoke("auth:verify-pin", pin, uuid),
  authLogin: (user: UserDetails & Omit<Auth, "pin">) =>
    ipcRenderer.invoke("auth:login", user),
  authLogout: () => ipcRenderer.invoke("auth:logout"),

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

  // Theme
  getSystemTheme: () => ipcRenderer.invoke("theme:getSystemTheme"),
  onSystemThemeChange: (callback: (theme: string) => void) => {
    ipcRenderer.on("theme:system-changed", (_event, theme) => callback(theme));
    return () => {
      ipcRenderer.removeAllListeners("theme:system-changed");
    };
  },

  // Sync
  onSyncStatusUpdate: (
    cb: (status: {
      isOnline: boolean;
      lastSynced: Date;
      pendingChanges: number;
    }) => void,
  ) => on("sync-status-update", cb),

  // Database change notifications
  onDatabaseChange: (
    cb: (event: { table: string; action: string; data?: any }) => void,
  ) => on("database-change", cb),
};

try {
  contextBridge.exposeInMainWorld("electronAPI", appBridge);
} catch (error) {
  console.error("Failed to expose Electron API:", error);
}
