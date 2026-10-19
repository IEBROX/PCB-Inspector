import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { PythonBackendManager } from './pyManager';

// Single instance lock to prevent launching multiple instances/backends
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Focusing primary instance and exiting.');
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
const backendManager = new PythonBackendManager(8000);

const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.argv.includes('--dev'));

async function showBackendStartupError(message: string, logPath?: string) {
  const detail = logPath
    ? `${message}\n\nDiagnostic log:\n${logPath}`
    : message;
  await dialog.showMessageBox({
    type: 'error',
    title: 'PCB Inspector — Backend Failed',
    message: 'The inspection backend could not start.',
    detail,
    buttons: ['Quit', 'Retry'],
    defaultId: 1,
    cancelId: 0,
    noLink: true,
  }).then(async (result) => {
    if (result.response === 1) {
      const ok = await backendManager.start();
      if (!ok) {
        await showBackendStartupError(backendManager.getLastError() || message, logPath);
      }
    } else {
      app.quit();
    }
  });
}

async function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.ico');
  const appIcon = fs.existsSync(iconPath) ? iconPath : undefined;

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#111214',
    icon: appIcon,
    frame: false, // Modern industrial frameless window with custom titlebar
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
      webSecurity: true,
    },
  });

  // Remove default native menu bar
  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Start Python backend and wait for readiness before enabling inspection API calls
  const backendReady = await backendManager.start();
  if (!backendReady) {
    await showBackendStartupError(
      backendManager.getLastError() || 'Backend did not respond to health checks.',
      backendManager.getLogPath()
    );
  }

  const prodPath = path.join(__dirname, '../dist/index.html');
  const devUrl = isDev ? (process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173') : null;

  if (devUrl) {
    try {
      await mainWindow.loadURL(devUrl);
    } catch {
      await mainWindow.loadFile(prodPath);
    }
  } else {
    await mainWindow.loadFile(prodPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle second instance activation
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// IPC Handlers: Safe native dialogs
ipcMain.handle('dialog:openFile', async (_, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options?.title || 'Select File',
    defaultPath: options?.defaultPath,
    filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
    properties: options?.properties || ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) {
    return null;
  }
  return result.filePaths;
});

ipcMain.handle('dialog:openImageFile', async (_, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options?.title || 'Select PCB Inspection Image',
    defaultPath: options?.defaultPath,
    filters: options?.filters || [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'webp'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) {
    return null;
  }
  const filePath = result.filePaths[0];
  try {
    const fileBuffer = await fs.promises.readFile(filePath);
    const filename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'bmp' ? 'image/bmp' : 'image/jpeg';
    return {
      filePath,
      filename,
      mimeType,
      base64: fileBuffer.toString('base64'),
    };
  } catch (err: any) {
    console.error('Failed to read image file:', err);
    return null;
  }
});

ipcMain.handle('dialog:saveFile', async (_, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options?.title || 'Save File',
    defaultPath: options?.defaultPath,
    filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
  });
  if (result.canceled || !result.filePath) {
    return null;
  }
  return result.filePath;
});

ipcMain.handle('app:getInfo', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    isPackaged: app.isPackaged,
  };
});

ipcMain.handle('backend:status', async () => {
  const healthy = await backendManager.isBackendHealthy();
  return {
    running: healthy,
    port: backendManager.getPort(),
    url: backendManager.getBackendUrl(),
    error: backendManager.getLastError(),
  };
});

ipcMain.handle('backend:restart', async () => {
  backendManager.stop();
  const ok = await backendManager.start();
  return ok;
});

// Window controls IPC
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// App Lifecycle
if (gotTheLock) {
  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  backendManager.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  backendManager.stop();
});

app.on('will-quit', () => {
  backendManager.stop();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
