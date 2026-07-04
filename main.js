const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const {
  initializePrinter,
  notifyPrinterStatus,
  registerPrinterHandlers,
  setMainWindow,
} = require('./ipc/printer-handlers');
const { registerPrintQueueHandlers } = require('./ipc/print-queue-handlers');
const { registerSystemHandlers } = require('./ipc/system-handlers');
const printQueuePoller = require('./services/print-queue-poller');
const pairingConfig = require('./services/pairing-config');
const appSettings = require('./services/app-settings');
const updateService = require('./services/update-service');
const { buildApplicationMenu } = require('./windows/application-menu');

const APP_URL = process.env.FOMY_APP_URL || 'https://app.fomy.com.br/';
const isDev = !app.isPackaged;

if (isDev) {
  require('electron-reload')(__dirname, { hardResetMethod: 'exit' });
}

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;

function getWindowTitle() {
  return `Fomy Desktop - v${app.getVersion()}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: getWindowTitle(),
    show: false,
    autoHideMenuBar: false,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  setMainWindow(mainWindow);
  updateService.setParentWindow(mainWindow);
  printQueuePoller.setStatusWindow(mainWindow);

  const menu = buildApplicationMenu({
    mainWindow,
    onReload: () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.reload();
      }
    },
  });
  Menu.setApplicationMenu(menu);
  mainWindow.setMenu(menu);
  mainWindow.setAutoHideMenuBar(false);
  mainWindow.setMenuBarVisibility(true);

  mainWindow.once('ready-to-show', () => {
    mainWindow.setMenuBarVisibility(true);
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.setMenuBarVisibility(true);
    notifyPrinterStatus();
  });

  // Garante que o menu não fique oculto após Alt ou foco na página web.
  mainWindow.on('focus', () => {
    mainWindow.setMenuBarVisibility(true);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    setMainWindow(null);
    updateService.setParentWindow(null);
    printQueuePoller.setStatusWindow(null);
  });

  mainWindow.loadURL(APP_URL);
}

registerPrinterHandlers();
registerPrintQueueHandlers();
registerSystemHandlers();

app.whenReady().then(async () => {
  appSettings.initializeAutoStart();
  updateService.initializeUpdater();
  await initializePrinter();
  createWindow();

  if (pairingConfig.getPairing()) {
    printQueuePoller.start();
  }
});

app.on('before-quit', () => {
  printQueuePoller.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
