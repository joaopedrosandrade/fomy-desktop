const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const {
  initializePrinter,
  notifyPrinterStatus,
  registerPrinterHandlers,
  setMainWindow,
} = require('./ipc/printer-handlers');
const { registerPrintQueueHandlers } = require('./ipc/print-queue-handlers');
const printQueuePoller = require('./services/print-queue-poller');
const pairingConfig = require('./services/pairing-config');
const {
  buildApplicationMenu,
  openPrinterSettings,
} = require('./windows/printer-settings-window');

const APP_URL = process.env.FOMY_APP_URL || 'https://app.fomy.com.br/';
const WINDOW_TITLE = 'Fomy - Gestão para Restaurantes';
const isDev = !app.isPackaged;

if (isDev) {
  require('electron-reload')(__dirname, { hardResetMethod: 'exit' });
}

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: WINDOW_TITLE,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  setMainWindow(mainWindow);
  printQueuePoller.setStatusWindow(mainWindow);

  const menu = buildApplicationMenu({
    onOpenPrinterSettings: openPrinterSettings,
  });
  Menu.setApplicationMenu(menu);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    notifyPrinterStatus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    setMainWindow(null);
    printQueuePoller.setStatusWindow(null);
  });

  mainWindow.loadURL(APP_URL);
}

registerPrinterHandlers();
registerPrintQueueHandlers();

app.whenReady().then(async () => {
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
