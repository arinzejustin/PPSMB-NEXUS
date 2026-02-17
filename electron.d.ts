// electron.d.ts
import { IElectronAPI } from "./electron/types";

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    __appVersion?: string;
  }
}

export {};
