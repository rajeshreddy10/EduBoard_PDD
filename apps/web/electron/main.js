const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let tray = null;

// ─── Window Creation ───────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f23',
    show: false,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
      allowRunningInsecureContent: isDev,
    },
  });

  // Load app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (!isDev) autoUpdater.checkForUpdatesAndNotify();
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  setupMenu();
}

// ─── System Tray ───────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '../public/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open EduBoard', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: 'Dashboard', click: () => mainWindow?.webContents.send('navigate', '/dashboard') },
    { label: 'New Board', click: () => mainWindow?.webContents.send('navigate', '/smart-board') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('EduBoard');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ─── Application Menu ──────────────────────────────────────────────────────────
function setupMenu() {
  const template = [
    {
      label: 'EduBoard',
      submenu: [
        { label: 'About EduBoard', role: 'about' },
        { type: 'separator' },
        { label: 'Preferences', accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.webContents.send('navigate', '/settings') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Dashboard', accelerator: 'CmdOrCtrl+D', click: () => mainWindow?.webContents.send('navigate', '/dashboard') },
        { label: 'New Board', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('navigate', '/smart-board') },
        { label: 'Classrooms', accelerator: 'CmdOrCtrl+K', click: () => mainWindow?.webContents.send('navigate', '/classroom') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'zoom' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Help Center', click: () => mainWindow?.webContents.send('navigate', '/help') },
        { label: 'Keyboard Shortcuts', click: () => mainWindow?.webContents.send('show-shortcuts') },
        { label: 'Report an Issue', click: () => shell.openExternal('https://github.com/eduboard/issues') },
        { type: 'separator' },
        { label: 'Check for Updates', click: () => autoUpdater.checkForUpdates() },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC Handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('open-external', (_, url) => shell.openExternal(url));
ipcMain.handle('show-save-dialog', async (_, options) => dialog.showSaveDialog(mainWindow, options));
ipcMain.handle('show-open-dialog', async (_, options) => dialog.showOpenDialog(mainWindow, options));
ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) mainWindow.restore();
  else mainWindow?.maximize();
});
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('close-window', () => mainWindow?.close());
ipcMain.handle('is-maximized', () => mainWindow?.isMaximized() ?? false);
ipcMain.handle('toggle-fullscreen', () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()));

// ─── Auto Updater ──────────────────────────────────────────────────────────────
autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send('update-available');
});
autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded');
});
ipcMain.on('install-update', () => autoUpdater.quitAndInstall());

// ─── App Lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
