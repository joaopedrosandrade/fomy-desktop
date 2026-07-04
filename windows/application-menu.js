const { Menu } = require('electron');
const appSettings = require('../services/app-settings');
const updateService = require('../services/update-service');
const { openConsoleWindow } = require('./console-window');
const { openActivePrinterWindow } = require('./active-printer-window');
const { openPrintersListWindow } = require('./printers-list-window');
const { openPrinterSettings } = require('./printer-settings-window');

/**
 * @param {object} options
 * @param {import('electron').BrowserWindow | null} options.mainWindow
 * @param {() => void} [options.onReload]
 */
function buildApplicationMenu({ mainWindow, onReload }) {
  const reloadPage = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.reload();
      return;
    }
    if (typeof onReload === 'function') {
      onReload();
    }
  };

  const template = [
    {
      label: 'Sistema',
      submenu: [
        {
          label: 'Inicialização automática',
          type: 'checkbox',
          checked: appSettings.getAutoStartEnabled(),
          click: (menuItem) => {
            appSettings.setAutoStartEnabled(menuItem.checked);
          },
        },
        { type: 'separator' },
        {
          label: 'Verificar Atualização',
          click: () => updateService.checkForUpdates({ silent: false }),
        },
        {
          label: 'Atualizar',
          accelerator: 'F5',
          click: reloadPage,
        },
        { type: 'separator' },
        {
          label: 'Console',
          accelerator: 'Ctrl+Shift+I',
          click: () => openConsoleWindow(mainWindow),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' },
      ],
    },
    {
      label: 'Impressora',
      submenu: [
        {
          label: 'Impressoras Disponíveis',
          click: () => openPrintersListWindow(),
        },
        {
          label: 'Impressora Ativa',
          click: () => openActivePrinterWindow(),
        },
        { type: 'separator' },
        {
          label: 'Adicionar nova impressora',
          accelerator: 'Ctrl+Shift+P',
          click: () => openPrinterSettings(),
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

function refreshApplicationMenu(options) {
  const menu = buildApplicationMenu(options);
  Menu.setApplicationMenu(menu);
  return menu;
}

module.exports = {
  buildApplicationMenu,
  refreshApplicationMenu,
};
