const { BrowserWindow, Menu, shell } = require('electron');
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
    title: 'Configuração de Impressora — Fomy',
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

function buildApplicationMenu({ onOpenPrinterSettings }) {
  const template = [
    {
      label: 'Fomy',
      submenu: [
        {
          label: 'Configurar impressora...',
          accelerator: 'Ctrl+Shift+P',
          click: onOpenPrinterSettings,
        },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Abrir app Fomy',
          click: () => shell.openExternal('https://app.fomy.com.br/'),
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

module.exports = {
  buildApplicationMenu,
  openPrinterSettings,
};
