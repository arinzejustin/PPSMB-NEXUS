import pkg from "electron-updater";
import { ipcMain, app } from "electron";
import Store from "electron-store";
import { NotificationService } from "./notification.js";
const { autoUpdater } = pkg;
const StoreConstructor = Store.default || Store;
const store = new StoreConstructor({
    defaults: {
        updateDownloaded: false,
    },
});
export function setupAutoUpdater(mainWindow) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on("update-available", (info) => {
        mainWindow.webContents.send("update-available", info.version);
    });
    autoUpdater.on("download-progress", (p) => {
        mainWindow.webContents.send("update-progress", Math.round(p.percent));
    });
    autoUpdater.on("update-downloaded", (info) => {
        store.set("updateDownloaded", true);
        store.set("updateVersion", info.version);
        mainWindow.webContents.send("update-downloaded");
    });
    autoUpdater.on("update-not-available", () => {
        NotificationService.show("Up to Date", "You are already running the latest version.");
    });
    ipcMain.on("start-download", () => {
        autoUpdater.downloadUpdate();
    });
    ipcMain.on("quit-and-install", () => {
        autoUpdater.quitAndInstall();
    });
    ipcMain.handle("get-update-state", () => ({
        downloaded: store.get("updateDownloaded"),
        version: store.get("updateVersion"),
    }));
    ipcMain.on("check-for-updates", () => {
        NotificationService.show("Up to Date", "You are already running the latest version.");
        autoUpdater.checkForUpdates();
    });
    app.on("before-quit", () => {
        if (!store.get("updateDownloaded"))
            return;
    });
    autoUpdater.checkForUpdates();
}
