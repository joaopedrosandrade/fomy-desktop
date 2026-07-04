const { ipcMain, app } = require('electron');
const { openPrinterSettings } = require('../windows/printer-settings-window');

function registerSystemHandlers() {
  ipcMain.on('fomy:system:get-version', (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.handle('fomy:system:open-printer-settings', () => {
    openPrinterSettings();
    return { ok: true };
  });
}

module.exports = {
  registerSystemHandlers,
};
