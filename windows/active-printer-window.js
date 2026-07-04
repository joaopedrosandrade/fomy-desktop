const { BrowserWindow } = require('electron');
const path = require('path');

/** @type {import('electron').BrowserWindow | null} */
let activeWindow = null;

function getPreloadPath() {
  return path.join(__dirname, '..', 'preload', 'preload.js');
}

function openActivePrinterWindow() {
  if (activeWindow && !activeWindow.isDestroyed()) {
    activeWindow.focus();
    activeWindow.webContents.send('fomy:active-printer:refresh');
    return activeWindow;
  }

  activeWindow = new BrowserWindow({
    width: 520,
    height: 420,
    minWidth: 420,
    minHeight: 320,
    title: 'Impressora Ativa — Fomy',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  activeWindow.setMenu(null);
  activeWindow.loadFile(path.join(__dirname, '..', 'renderer', 'active-printer.html'));

  activeWindow.on('closed', () => {
    activeWindow = null;
  });

  return activeWindow;
}

module.exports = {
  openActivePrinterWindow,
};
