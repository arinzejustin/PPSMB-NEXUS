import pkg from "electron-updater";
import { BrowserWindow, ipcMain, app } from "electron";
import { NotificationService } from "./notification.js";
import { storeHelper } from "../store/store.js";

const { autoUpdater } = pkg;

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    mainWindow.webContents.send("update-available", info.version);
  });

  autoUpdater.on("download-progress", (p) => {
    mainWindow.webContents.send("update-progress", Math.round(p.percent));
  });

  autoUpdater.on("update-downloaded", (info) => {
    storeHelper.set("updateDownloaded", true);
    storeHelper.set("updateVersion", info.version);

    mainWindow.webContents.send("update-downloaded");
  });

  autoUpdater.on("update-not-available", () => {
    NotificationService.show(
      "Up to Date",
      "You are already running the latest version.",
    );
  });

  ipcMain.on("start-download", () => {
    autoUpdater.downloadUpdate();
  });

  ipcMain.on("quit-and-install", () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle("get-update-state", () => ({
    downloaded: storeHelper.get("updateDownloaded"),
    version: storeHelper.get("updateVersion"),
  }));

  ipcMain.on("check-for-updates", () => {
    NotificationService.show(
      "Up to Date",
      "You are already running the latest version.",
    );
    autoUpdater.checkForUpdates();
  });

  app.on("before-quit", () => {
    if (!storeHelper.get("updateDownloaded")) return;
  });

  autoUpdater.checkForUpdates();
}
