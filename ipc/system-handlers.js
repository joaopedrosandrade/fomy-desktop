const { ipcMain } = require('electron');
const { openPrinterSettings } = require('../windows/printer-settings-window');

function registerSystemHandlers() {
  ipcMain.handle('fomy:system:open-printer-settings', () => {
    openPrinterSettings();
    return { ok: true };
  });
}

module.exports = {
  registerSystemHandlers,
};
