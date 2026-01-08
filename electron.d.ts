// electron.d.ts
import { IElectronAPI } from "./electron/preload.cts";

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

export {};
