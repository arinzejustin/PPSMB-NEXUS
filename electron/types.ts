import type { BrowserWindowConstructorOptions } from "electron";

export interface Auth {
  isAuthenticated: boolean;
  token: string | null;
  hasSetPin: boolean;
  pin?: string;
}

export interface UserDetails {
  name: string;
  email: string;
  department: string;
  role: string;
  lastLogin: number;
  deviceId: string;
  devices: string[];
  uuid: string;
}


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
  exitOrRestart: (action: "exit" | "restart") => Promise<void>;
  navigateHistory: (action: "back" | "forward") => Promise<void>;
  syncRecords: () => Promise<void>;
  verifyPin: (
    pin: string,
    uuid: string
  ) => Promise<(UserDetails & Omit<Auth, "pin">) | null>;
}

export interface UpdateSchema {
  updateDownloaded: boolean;
  updateVersion?: string;
}

export interface FileVersionInfo {
  version: string;
  url: string;
  checksum?: string;
}
