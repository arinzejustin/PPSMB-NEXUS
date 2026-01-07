import { autoUpdater } from "electron-updater";
import { BrowserWindow, ipcMain } from "electron";
import log from "electron-log";

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    mainWindow.webContents.send("update-available", info.version);
  });

  autoUpdater.on("download-progress", (progressObj) => {
    mainWindow.webContents.send("update-progress", progressObj.percent);
  });

  autoUpdater.on("update-downloaded", () => {
    mainWindow.webContents.send("update-downloaded");
  });

  autoUpdater.on("error", (err) => {
    mainWindow.webContents.send("update-error", err.message);
  });

  ipcMain.on("start-download", () => {
    autoUpdater.downloadUpdate();
  });

  ipcMain.on("quit-and-install", () => {
    autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdates();
}
