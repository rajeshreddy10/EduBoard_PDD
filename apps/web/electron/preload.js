const { contextBridge, ipcRenderer } = require('electron');

/**
 * EduBoard — Electron Preload
 * Exposes safe IPC API to the renderer process via contextBridge.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),

  // OS utilities
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Auto-updater
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  installUpdate: () => ipcRenderer.send('install-update'),

  // Navigation events from main process
  onNavigate: (callback) => ipcRenderer.on('navigate', (_, route) => callback(route)),
  onShowShortcuts: (callback) => ipcRenderer.on('show-shortcuts', callback),

  // File operations
  saveFile: async (defaultPath, content, filters = []) => {
    const result = await ipcRenderer.invoke('show-save-dialog', {
      defaultPath,
      filters: filters.length ? filters : [{ name: 'All Files', extensions: ['*'] }],
    });
    if (!result.canceled && result.filePath) {
      return result.filePath;
    }
    return null;
  },

  // Cleanup listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

// Expose isElectron flag
contextBridge.exposeInMainWorld('isElectron', true);
