const Store = require('electron-store');

const store = new Store({
  name: 'printer-config',
  defaults: {
    printer: null,
    paperMm: 80,
  },
});

/** @typedef {'network' | 'windows' | 'serial' | 'bluetooth'} PrinterConnectionType */

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

/** @returns {58 | 80} */
function getPaperMm() {
  return Number(store.get('paperMm', 80)) === 58 ? 58 : 80;
}

/** @param {unknown} mm */
function setPaperMm(mm) {
  store.set('paperMm', Number(mm) === 58 ? 58 : 80);
}

/**
 * Anexa ?paper=58|80 à URL do cupom ESC/POS.
 * @param {string} cupomUrl
 * @param {number} [paperMm]
 */
function withPaperQuery(cupomUrl, paperMm = getPaperMm()) {
  const paper = paperMm === 58 ? 58 : 80;
  try {
    const url = new URL(String(cupomUrl || ''));
    url.searchParams.set('paper', String(paper));
    return url.toString();
  } catch {
    const sep = String(cupomUrl).includes('?') ? '&' : '?';
    return `${cupomUrl}${sep}paper=${paper}`;
  }
}

module.exports = {
  getPrinterConfig,
  setPrinterConfig,
  getPaperMm,
  setPaperMm,
  withPaperQuery,
};
