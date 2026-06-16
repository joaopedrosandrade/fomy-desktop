const { ipcMain } = require('electron');
const printerConfig = require('../services/printer-config');
const printerService = require('../services/printer-service');

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;

/** @param {import('electron').BrowserWindow} window */
function setMainWindow(window) {
  mainWindow = window;
}

function notifyPrinterStatus() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('fomy:printer-status', printerService.getStatus());
}

/** @param {unknown} data */
function decodePrintData(data) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (typeof data === 'string') return Buffer.from(data, 'base64');
  throw new Error('Dados de impressão inválidos. Use base64, Buffer ou Uint8Array.');
}

function registerPrinterHandlers() {
  ipcMain.handle('fomy:printer:list', async () => {
    const webContents = mainWindow && !mainWindow.isDestroyed()
      ? mainWindow.webContents
      : null;
    return printerService.listPrinters(webContents);
  });

  ipcMain.handle('fomy:printer:get-config', () => {
    return printerConfig.getPrinterConfig();
  });

  ipcMain.handle('fomy:printer:get-status', () => {
    return printerService.getStatus();
  });

  ipcMain.handle('fomy:printer:list-bluetooth', async () => {
    return printerService.listBluetoothPrinters();
  });

  ipcMain.handle('fomy:printer:configure-bluetooth', async (_event, options = {}) => {
    const config = await printerService.configureBluetooth(options);
    printerConfig.setPrinterConfig(config);
    const result = await printerService.connect(config);
    notifyPrinterStatus();
    return { config, status: result };
  });

  ipcMain.handle('fomy:printer:configure-from-system', async (_event, printerName) => {
    const config = await printerService.configureFromSystemPrinter(printerName);
    printerConfig.setPrinterConfig(config);
    const result = await printerService.connect(config);
    notifyPrinterStatus();
    return { config, status: result };
  });

  ipcMain.handle('fomy:printer:save-config', async (_event, config) => {
    printerConfig.setPrinterConfig(config);
    const result = await printerService.connect(config);
    notifyPrinterStatus();
    return result;
  });

  ipcMain.handle('fomy:printer:clear-config', async () => {
    printerConfig.setPrinterConfig(null);
    const result = await printerService.disconnect();
    notifyPrinterStatus();
    return result;
  });

  ipcMain.handle('fomy:printer:test', async () => {
    const config = printerConfig.getPrinterConfig();
    if (!config) {
      const result = printerService.getStatus();
      notifyPrinterStatus();
      return result;
    }
    const result = await printerService.testConnection(config);
    notifyPrinterStatus();
    return result;
  });

  ipcMain.handle('fomy:printer:print', async (_event, data) => {
    const buffer = decodePrintData(data);
    const config = printerConfig.getPrinterConfig();
    await printerService.print(buffer, config);
    return { ok: true };
  });

  ipcMain.handle('fomy:printer:print-text', async (_event, text, options = {}) => {
    const encoding = options.encoding || 'utf8';
    const buffer = Buffer.from(String(text), encoding);
    const config = printerConfig.getPrinterConfig();
    await printerService.print(buffer, config);
    return { ok: true };
  });
}

async function initializePrinter() {
  const config = printerConfig.getPrinterConfig();
  await printerService.autoConnect(config);
}

module.exports = {
  initializePrinter,
  notifyPrinterStatus,
  registerPrinterHandlers,
  setMainWindow,
};
