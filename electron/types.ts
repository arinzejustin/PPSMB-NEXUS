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
  // Database Operations
  dbInsert: <T extends Record<string, any>>(
    tableName: string,
    doc: T,
    incoming?: boolean,
  ) => Promise<T>;
  dbInsertMany: <T extends Record<string, any>>(
    tableName: string,
    docs: T[],
    incoming?: boolean,
  ) => Promise<T[]>;
  dbFind: <T>(
    tableName: string,
    query?: any,
    sort?: any,
    limit?: number,
    skip?: number,
  ) => Promise<T[]>;
  dbFindOne: <T>(tableName: string, query?: any) => Promise<T | null>;
  dbFindMany: <T>(tableName: string, query?: any) => Promise<T[]>;
  dbUpdate: (
    tableName: string,
    query: any,
    update: any,
    options?: any,
  ) => Promise<number>;
  dbDelete: (tableName: string, query: any, options?: any) => Promise<number>;
  dbCount: (tableName: string, query?: any) => Promise<number>;
  syncRecords: () => Promise<{ success: boolean; error?: string }>;

  // Existing helpers
  saveData: (item: unknown) => Promise<void>;
  getData: (key: string) => Promise<unknown>;
  sendNotification: (title: string, body: string) => void;

  // Document scanner
  onScanDocument: (cb: () => void) => Unsubscribe;
  scannerGetDevices: () => Promise<any>;
  scannerScan: (format?: string) => Promise<string | { error: string }>;
  scannerScanSilent: (format?: string, deviceId?: string) => Promise<string | { error: string }>;

  // Updater
  startDownload: () => void;
  confirmInstall: () => void;
  checkUpdate: () => void;
  onIdle: (cb: () => void) => Unsubscribe;

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
    options?: BrowserWindowConstructorOptions,
  ) => Promise<void>;

  openBrowser: (url: string) => Promise<void>;
  getNitroPort: () => Promise<number>;

  openContextMenu: (
    cb: (options: Record<string, boolean | number | string>) => void,
  ) => Unsubscribe;
  exitOrRestart: (action: "exit" | "restart") => Promise<void>;
  navigateHistory: (action: "back" | "forward") => Promise<void>;
  verifyPin: (
    pin: string,
    uuid: string,
  ) => Promise<(UserDetails & Omit<Auth, "pin">) | null>;
  getSetting: (key: string) => Promise<any>;
  setSetting: (key: string, value: any) => Promise<boolean>;
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<boolean>;
  getUser: () => Promise<any>;
  clearUser: () => Promise<boolean>;
  getSystemTheme: () => Promise<"light" | "dark">;
  onSystemThemeChange: (cb: (theme: string) => void) => Unsubscribe;
  onSyncStatusUpdate: (
    cb: (status: {
      isOnline: boolean;
      lastSynced: Date;
      pendingChanges: number;
      unsyncedSizeMb: number;
      requiresIntervention: boolean;
    }) => void,
  ) => Unsubscribe;
  onDatabaseChange: (
    cb: (event: { table: string; action: string; data?: any }) => void,
  ) => Unsubscribe;

  authLogin: (user: UserDetails & Omit<Auth, "pin">) => Promise<boolean>;
  authLogout: () => Promise<boolean>;

  queuePrint(job: any): Promise<void>;
  cancelPrint(id: string): Promise<void>;
  reorderPrint(ids: string[]): Promise<void>;
  getPrinters(): Promise<Electron.PrinterInfo[]>;
  savePrinter(printer: string): Promise<void>;
  loadPrinter(): Promise<string | null>;
  onPrintProgress(
    cb: (data: { jobId: string; status: PrintStatus }) => void,
  ): Unsubscribe;
  reprintJob(jobId: string): Promise<void>;
  getPrintHistory(): Promise<StoredPrintJob[]>;
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

export interface AppStore {
  user?: UserDetails & Omit<Auth, "pin">;
  session?: {
    token: Auth["token"];
    expiresAt: number;
  };
  settings: {
    theme: "light" | "dark" | "system";
    language: string;
    autoSave: boolean;
    notifications: boolean;
    lockScreen: number;
    soundEffects: boolean;
    emailNotifications: boolean;
    autoUpdate: boolean;
    fontSize: string;
    compactMode: boolean;
    showOnlineStatus: boolean;
    dataSync: boolean;
  };
  recentFiles: string[];
  lastSync?: number;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  updateDownloaded: boolean;
  nitroPort?: number;
}

export type PrintContentType = "html" | "csv" | "excel";

export type PrintJob = {
  id: string;
  html: string;
  contentType?: PrintContentType;
  rawContent?: string;
  printer?: string;
  silent: boolean;
  name: string;
  cancelled?: boolean;
  createdAt: string;
};

export type PrintStatus =
  | "completed"
  | "queued"
  | "printing"
  | "pdf fallback"
  | "cancelled"
  | "failed";

export interface StoredPrintJob extends PrintJob {
  status: PrintStatus;
  finishedAt: string;
}
