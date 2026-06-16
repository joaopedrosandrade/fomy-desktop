const Store = require('electron-store');

const store = new Store({
  name: 'printer-config',
  defaults: {
    printer: null,
  },
});

/** @typedef {'network' | 'windows' | 'serial'} PrinterConnectionType */

/**
 * @typedef {Object} NetworkPrinterConfig
 * @property {'network'} type
 * @property {string} host
 * @property {number} [port]
 */

/**
 * @typedef {Object} WindowsPrinterConfig
 * @property {'windows'} type
 * @property {string} printerName
 */

/** @typedef {'network' | 'windows' | 'serial' | 'bluetooth'} PrinterConnectionType */

/**
 * @typedef {Object} BluetoothPrinterConfig
 * @property {'bluetooth'} type
 * @property {string} path
 * @property {number} baudRate
 * @property {string} [deviceName]
 */

/**
 * @typedef {Object} SerialPrinterConfig
 * @property {'serial'} type
 * @property {string} path
 * @property {number} [baudRate]
 */

/** @typedef {NetworkPrinterConfig | WindowsPrinterConfig | SerialPrinterConfig | BluetoothPrinterConfig} PrinterConfig */

function getPrinterConfig() {
  return store.get('printer');
}

/** @param {PrinterConfig | null} config */
function setPrinterConfig(config) {
  if (config === null) {
    store.delete('printer');
    return;
  }
  store.set('printer', config);
}

module.exports = {
  getPrinterConfig,
  setPrinterConfig,
};
