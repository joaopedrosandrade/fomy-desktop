const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fomyDesktop', {
  isDesktop: true,

  printer: {
    list: () => ipcRenderer.invoke('fomy:printer:list'),
    listBluetooth: () => ipcRenderer.invoke('fomy:printer:list-bluetooth'),
    getConfig: () => ipcRenderer.invoke('fomy:printer:get-config'),
    getStatus: () => ipcRenderer.invoke('fomy:printer:get-status'),
    saveConfig: (config) => ipcRenderer.invoke('fomy:printer:save-config', config),
    configureBluetooth: (options) => ipcRenderer.invoke('fomy:printer:configure-bluetooth', options),
    configureFromSystem: (printerName) => ipcRenderer.invoke('fomy:printer:configure-from-system', printerName),
    clearConfig: () => ipcRenderer.invoke('fomy:printer:clear-config'),
    test: () => ipcRenderer.invoke('fomy:printer:test'),

    /** Envia dados ESC/POS em base64 */
    print: (base64Data) => ipcRenderer.invoke('fomy:printer:print', base64Data),

    /** Envia texto simples (UTF-8 por padrão) */
    printText: (text, options) => ipcRenderer.invoke('fomy:printer:print-text', text, options),

    /** Impressão silenciosa de cupom via URL assinada (ESC/POS) */
    printCupomFromUrl: (cupomUrl) => ipcRenderer.invoke('fomy:printer:print-cupom-url', cupomUrl),

    onStatusChange: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('callback deve ser uma função');
      }

      const listener = (_event, status) => callback(status);
      ipcRenderer.on('fomy:printer-status', listener);

      return () => {
        ipcRenderer.removeListener('fomy:printer-status', listener);
      };
    },
  },

  printQueue: {
    getStatus: () => ipcRenderer.invoke('fomy:print-queue:get-status'),
    getPairing: () => ipcRenderer.invoke('fomy:print-queue:get-pairing'),
    savePairing: (input) => ipcRenderer.invoke('fomy:print-queue:save-pairing', input),
    clearPairing: () => ipcRenderer.invoke('fomy:print-queue:clear-pairing'),
    onStatusChange: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('callback deve ser uma função');
      }
      const listener = (_event, status) => callback(status);
      ipcRenderer.on('fomy:print-queue-status', listener);
      return () => ipcRenderer.removeListener('fomy:print-queue-status', listener);
    },
  },

  system: {
    openPrinterSettings: () => ipcRenderer.invoke('fomy:system:open-printer-settings'),
  },

  update: {
    getInfo: () => ipcRenderer.invoke('fomy:update:get-info'),
    download: () => ipcRenderer.invoke('fomy:update:download'),
    onProgress: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('callback deve ser uma função');
      }
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('fomy:update:progress', listener);
      return () => ipcRenderer.removeListener('fomy:update:progress', listener);
    },
    onReady: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('callback deve ser uma função');
      }
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('fomy:update:ready', listener);
      return () => ipcRenderer.removeListener('fomy:update:ready', listener);
    },
    onError: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('callback deve ser uma função');
      }
      const listener = (_event, message) => callback(message);
      ipcRenderer.on('fomy:update:error', listener);
      return () => ipcRenderer.removeListener('fomy:update:error', listener);
    },
  },

  events: {
    onPrintersListRefresh: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('fomy:printers-list:refresh', listener);
      return () => ipcRenderer.removeListener('fomy:printers-list:refresh', listener);
    },
    onActivePrinterRefresh: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('fomy:active-printer:refresh', listener);
      return () => ipcRenderer.removeListener('fomy:active-printer:refresh', listener);
    },
  },
});
