const { BrowserWindow } = require('electron');
const path = require('path');

/** @type {import('electron').BrowserWindow | null} */
let listWindow = null;

function getPreloadPath() {
  return path.join(__dirname, '..', 'preload', 'preload.js');
}

function openPrintersListWindow() {
  if (listWindow && !listWindow.isDestroyed()) {
    listWindow.focus();
    listWindow.webContents.send('fomy:printers-list:refresh');
    return listWindow;
  }

  listWindow = new BrowserWindow({
    width: 640,
    height: 560,
    minWidth: 520,
    minHeight: 420,
    title: 'Impressoras Disponíveis — Fomy',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  listWindow.setMenu(null);
  listWindow.loadFile(path.join(__dirname, '..', 'renderer', 'printers-list.html'));

  listWindow.on('closed', () => {
    listWindow = null;
  });

  return listWindow;
}

module.exports = {
  openPrintersListWindow,
};
