import { contextBridge, ipcRenderer } from 'electron';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}

const electronAPI = {
  // Safe dialogs
  openFileDialog: (options?: OpenDialogOptions): Promise<string[] | null> => {
    return ipcRenderer.invoke('dialog:openFile', options);
  },
  openImageDialog: (options?: OpenDialogOptions): Promise<{ filePath: string; filename: string; mimeType: string; base64: string } | null> => {
    return ipcRenderer.invoke('dialog:openImageFile', options);
  },
  saveFileDialog: (options?: SaveDialogOptions): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:saveFile', options);
  },

  // App & Environment
  getAppInfo: (): Promise<{ version: string; platform: string; arch: string }> => {
    return ipcRenderer.invoke('app:getInfo');
  },

  // Python Backend Process Management
  checkBackendStatus: (): Promise<{ running: boolean; port: number; url: string; error?: string | null }> => {
    return ipcRenderer.invoke('backend:status');
  },
  restartBackend: (): Promise<boolean> => {
    return ipcRenderer.invoke('backend:restart');
  },

  // Window Controls for Industrial Dark Titlebar
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
