import { contextBridge, ipcRenderer } from 'electron';
{
    IElectronAPI;
}
from;
'../types';
const api = {
    saveData: (item) => ipcRenderer.invoke('db:save', item),
    getData: (key) => ipcRenderer.invoke('db:get-data', key),
    sendNotification: (title, body) => ipcRenderer.send('notification', title, body)
};
contextBridge.exposeInMainWorld('electronAPI', api);
