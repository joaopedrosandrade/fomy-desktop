const printerConfig = require('./printer-config');
const printerService = require('./printer-service');

/**
 * @param {string} cupomUrl
 */
function appendEscPosFormat(cupomUrl) {
  const url = new URL(cupomUrl);
  url.searchParams.set('format', 'escpos');
  return url.toString();
}

/**
 * @param {string} cupomUrl
 */
async function fetchEscPosBuffer(cupomUrl) {
  const response = await fetch(appendEscPosFormat(cupomUrl), {
    headers: { Accept: 'application/octet-stream' },
  });

  if (!response.ok) {
    throw new Error(`Cupom ESC/POS indisponível (HTTP ${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error('Cupom ESC/POS vazio.');
  }

  return buffer;
}

/**
 * Impressão silenciosa de cupom (sem diálogo do Windows).
 *
 * @param {string} cupomUrl URL assinada do cupom (token público)
 */
async function printCupomFromUrl(cupomUrl) {
  if (!cupomUrl) {
    throw new Error('URL do cupom não informada.');
  }

  const printer = printerConfig.getPrinterConfig();
  if (!printer) {
    throw new Error('Configure a impressora no Fomy Desktop (Ctrl+Shift+P).');
  }

  const buffer = await fetchEscPosBuffer(cupomUrl);
  await printerService.print(buffer, printer);

  return { ok: true };
}

module.exports = {
  printCupomFromUrl,
};
