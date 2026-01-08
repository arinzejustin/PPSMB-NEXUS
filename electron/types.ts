export interface IElectronAPI {
  saveData: (item: {
    id: string;
    content: string;
    synced: number;
  }) => Promise<boolean>;
  getData: (key: string) => Promise<string | null>;
  sendNotification: (title: string, body: string) => void;
  onScanDocument: (callback: () => void) => void;
  removeScanDocumentListener: () => void;
  startDownload: () => void;
  confirmInstall: () => void;
  onUpdateAvailable: (callback: (version: string) => void) => void;
  onUpdateProgress: (callback: (percent: number) => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
}
