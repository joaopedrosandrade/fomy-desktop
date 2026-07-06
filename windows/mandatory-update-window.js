const { BrowserWindow } = require('electron');
const path = require('path');

/** @type {import('electron').BrowserWindow | null} */
let mandatoryWindow = null;

function getPreloadPath() {
  return path.join(__dirname, '..', 'preload', 'preload.js');
}

/**
 * @param {object} info
 * @param {string} info.currentVersion
 * @param {string} info.newVersion
 * @param {import('electron').BrowserWindow | null} [parentWindow]
 */
function showMandatoryUpdateWindow(info, parentWindow = null) {
  if (mandatoryWindow && !mandatoryWindow.isDestroyed()) {
    mandatoryWindow.focus();
    return mandatoryWindow;
  }

  if (parentWindow && !parentWindow.isDestroyed()) {
    parentWindow.hide();
  }

  mandatoryWindow = new BrowserWindow({
    width: 480,
    height: 520,
    resizable: false,
    maximizable: false,
    minimizable: false,
    closable: false,
    alwaysOnTop: true,
    center: true,
    title: 'Atualização necessária — Fomy',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    parent: parentWindow && !parentWindow.isDestroyed() ? parentWindow : undefined,
    modal: Boolean(parentWindow),
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mandatoryWindow.setMenu(null);

  const query = new URLSearchParams({
    current: info.currentVersion,
    new: info.newVersion,
  });

  mandatoryWindow.loadFile(
    path.join(__dirname, '..', 'renderer', 'mandatory-update.html'),
    { query: Object.fromEntries(query) },
  );

  mandatoryWindow.once('ready-to-show', () => {
    mandatoryWindow.show();
    mandatoryWindow.focus();
  });

  mandatoryWindow.on('closed', () => {
    mandatoryWindow = null;
  });

  return mandatoryWindow;
}

function closeMandatoryUpdateWindow() {
  if (mandatoryWindow && !mandatoryWindow.isDestroyed()) {
    mandatoryWindow.setAlwaysOnTop(false);
    mandatoryWindow.setClosable(true);
    mandatoryWindow.close();
    mandatoryWindow = null;
  }
}

/** Fecha a janela de atualização para o instalador NSIS aparecer na frente. */
function hideMandatoryUpdateForInstall() {
  if (!mandatoryWindow || mandatoryWindow.isDestroyed()) return;

  mandatoryWindow.setAlwaysOnTop(false);
  mandatoryWindow.setClosable(true);
  mandatoryWindow.hide();
  mandatoryWindow.close();
  mandatoryWindow = null;
}

function isMandatoryWindowOpen() {
  return mandatoryWindow && !mandatoryWindow.isDestroyed();
}

function getMandatoryWindow() {
  return mandatoryWindow && !mandatoryWindow.isDestroyed() ? mandatoryWindow : null;
}

module.exports = {
  closeMandatoryUpdateWindow,
  getMandatoryWindow,
  hideMandatoryUpdateForInstall,
  isMandatoryWindowOpen,
  showMandatoryUpdateWindow,
};
