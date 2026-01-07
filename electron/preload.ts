import { contextBridge, ipcRenderer } from 'electron';

export interface IElectronAPI {
  saveData: (item: { id: string; content: string; synced: number }) => Promise<boolean>;
  getData: (key: string) => Promise<string | null>;
  sendNotification: (title: string, body: string) => void;
}

const api: IElectronAPI = {
  saveData: (item) => ipcRenderer.invoke('db:save', item),
  getData: (key) => ipcRenderer.invoke('db:get-data', key),
  sendNotification: (title, body) => ipcRenderer.send('notification', title, body)
};

contextBridge.exposeInMainWorld('electronAPI', api);