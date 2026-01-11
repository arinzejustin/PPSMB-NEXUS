import type { BrowserWindowConstructorOptions } from "electron";

export type Unsubscribe = () => void;

export interface IElectronAPI {
  saveData: (item: unknown) => Promise<void>;
  getData: (key: string) => Promise<unknown>;
  sendNotification: (title: string, body: string) => void;

  // Document scanner
  onScanDocument: (cb: () => void) => Unsubscribe;

  // Updater
  startDownload: () => void;
  confirmInstall: () => void;
  checkUpdate: () => void;

  onUpdateAvailable: (cb: (version: string) => void) => Unsubscribe;
  onUpdateProgress: (cb: (percent: number) => void) => Unsubscribe;
  onUpdateDownloaded: (cb: () => void) => Unsubscribe;

  // Persistent update state
  getUpdateState: () => Promise<{
    downloaded: boolean;
    version?: string;
  }>;

  openModal: (
    routeUrl: string,
    options?: BrowserWindowConstructorOptions
  ) => Promise<void>;

  openBrowser: (url: string) => Promise<void>;

  openContextMenu: (
    cb: (options: Record<string, boolean | number | string>) => void
  ) => Unsubscribe;
}

export interface UpdateSchema {
  updateDownloaded: boolean;
  updateVersion?: string;
}
