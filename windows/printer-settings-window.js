const { BrowserWindow } = require('electron');
const path = require('path');

/** @type {import('electron').BrowserWindow | null} */
let settingsWindow = null;

function getPreloadPath() {
  return path.join(__dirname, '..', 'preload', 'preload.js');
}

function getSettingsHtmlPath() {
  return path.join(__dirname, '..', 'renderer', 'printer-settings.html');
}

function openPrinterSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 480,
    minHeight: 600,
    title: 'Adicionar Impressora — Fomy',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  settingsWindow.setMenu(null);
  settingsWindow.loadFile(getSettingsHtmlPath());

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

module.exports = {
  openPrinterSettings,
};
