const Store = require('electron-store');

const store = new Store({
  name: 'fomy-desktop',
  defaults: {
    pairing: null,
  },
});

/**
 * @typedef {Object} PairingConfig
 * @property {string} apiBaseUrl
 * @property {string} token
 * @property {string} [establishment]
 * @property {number} [establishmentId]
 */

/** @returns {PairingConfig | null} */
function getPairing() {
  const pairing = store.get('pairing');
  if (!pairing || typeof pairing !== 'object') {
    return null;
  }
  const token = String(pairing.token || '').trim();
  const apiBaseUrl = String(pairing.apiBaseUrl || '').replace(/\/+$/, '');
  if (token.length !== 48 || !apiBaseUrl) {
    return null;
  }
  return { ...pairing, token, apiBaseUrl };
}

/** @param {PairingConfig | null} pairing */
function setPairing(pairing) {
  if (!pairing) {
    store.delete('pairing');
    return;
  }
  store.set('pairing', {
    apiBaseUrl: String(pairing.apiBaseUrl || '').replace(/\/+$/, ''),
    token: String(pairing.token || '').trim(),
    establishment: pairing.establishment || null,
    establishmentId: pairing.establishmentId || null,
    savedAt: Date.now(),
  });
}

function clearPairing() {
  store.delete('pairing');
}

module.exports = {
  getPairing,
  setPairing,
  clearPairing,
};
