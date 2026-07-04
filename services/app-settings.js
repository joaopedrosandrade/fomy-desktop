const Store = require('electron-store');
const { app } = require('electron');

const store = new Store({
  name: 'app-settings',
  defaults: {
    autoStart: true,
  },
});

function getAutoStartEnabled() {
  return store.get('autoStart');
}

/** @param {boolean} enabled */
function setAutoStartEnabled(enabled) {
  store.set('autoStart', enabled);
  applyAutoStart(enabled);
}

function applyAutoStart(enabled) {
  if (process.platform === 'win32' || process.platform === 'darwin') {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
      args: [],
    });
    return;
  }

  app.setLoginItemSettings({ openAtLogin: enabled });
}

function initializeAutoStart() {
  const enabled = getAutoStartEnabled();
  applyAutoStart(enabled);
  return enabled;
}

module.exports = {
  applyAutoStart,
  getAutoStartEnabled,
  initializeAutoStart,
  setAutoStartEnabled,
};
