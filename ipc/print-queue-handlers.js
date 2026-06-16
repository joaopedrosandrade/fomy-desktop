const { ipcMain } = require('electron');
const printQueuePoller = require('../services/print-queue-poller');
const pairingConfig = require('../services/pairing-config');

function registerPrintQueueHandlers() {
  ipcMain.handle('fomy:print-queue:get-status', () => {
    return printQueuePoller.getRuntimeStatus();
  });

  ipcMain.handle('fomy:print-queue:get-pairing', () => {
    return pairingConfig.getPairing();
  });

  ipcMain.handle('fomy:print-queue:save-pairing', async (_event, input) => {
    return printQueuePoller.savePairing(input || {});
  });

  ipcMain.handle('fomy:print-queue:clear-pairing', () => {
    printQueuePoller.clearPairing();
    return printQueuePoller.getRuntimeStatus();
  });
}

module.exports = {
  registerPrintQueueHandlers,
};
