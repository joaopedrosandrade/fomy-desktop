const { ipcMain } = require('electron');
const updateService = require('../services/update-service');

function registerUpdateHandlers() {
  ipcMain.handle('fomy:update:get-info', () => {
    return updateService.getMandatoryUpdateInfo();
  });

  ipcMain.handle('fomy:update:download', async () => {
    return updateService.downloadMandatoryUpdate();
  });
}

module.exports = {
  registerUpdateHandlers,
};
