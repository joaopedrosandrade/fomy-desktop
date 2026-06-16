const { BrowserWindow } = require('electron');

const LOAD_TIMEOUT_MS = 20000;
const PRINT_DELAY_MS = 600;

/**
 * Imprime o cupom HTML (mesmo layout da impressão manual no navegador).
 *
 * @param {string} cupomUrl
 * @param {string | undefined} printerName
 */
function printHtmlUrl(cupomUrl, printerName) {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      show: false,
      width: 420,
      height: 900,
      webPreferences: {
        offscreen: true,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });

    let settled = false;

    /** @param {Error | string} error */
    function fail(error) {
      if (settled) {
        return;
      }
      settled = true;
      if (!win.isDestroyed()) {
        win.destroy();
      }
      reject(error instanceof Error ? error : new Error(String(error)));
    }

    function succeed() {
      if (settled) {
        return;
      }
      settled = true;
      if (!win.isDestroyed()) {
        win.destroy();
      }
      resolve();
    }

    const loadTimer = setTimeout(() => {
      fail(new Error('Tempo esgotado ao carregar o cupom para impressão.'));
    }, LOAD_TIMEOUT_MS);

    win.webContents.on('did-fail-load', (_event, _code, description) => {
      clearTimeout(loadTimer);
      fail(new Error(description || 'Falha ao carregar o cupom.'));
    });

    win.webContents.once('did-finish-load', () => {
      clearTimeout(loadTimer);
      setTimeout(() => {
        win.webContents.print(
          {
            silent: true,
            printBackground: true,
            deviceName: printerName || undefined,
          },
          (success, failureReason) => {
            if (success) {
              succeed();
              return;
            }
            fail(new Error(failureReason || 'Falha ao imprimir cupom HTML.'));
          },
        );
      }, PRINT_DELAY_MS);
    });

    win.loadURL(cupomUrl);
  });
}

module.exports = {
  printHtmlUrl,
};
