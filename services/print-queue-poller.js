const pairingConfig = require('./pairing-config');
const printerConfig = require('./printer-config');
const printerService = require('./printer-service');

const POLL_MS = 4000;

/** @type {ReturnType<typeof setInterval> | null} */
let pollTimer = null;

let pollInFlight = false;
let printInFlight = false;

/** @type {{ active: boolean, lastPollAt: number | null, lastPrintAt: number | null, lastError: string | null, lastJobLabel: string | null, jobsPrintedSession: number }} */
let runtimeStatus = {
  active: false,
  lastPollAt: null,
  lastPrintAt: null,
  lastError: null,
  lastJobLabel: null,
  jobsPrintedSession: 0,
};

/** @type {import('electron').BrowserWindow | null} */
let statusWindow = null;

/** @param {import('electron').BrowserWindow | null} window */
function setStatusWindow(window) {
  statusWindow = window;
}

function getRuntimeStatus() {
  const pairing = pairingConfig.getPairing();
  const printer = printerConfig.getPrinterConfig();
  const printerStatus = printerService.getStatus();

  return {
    ...runtimeStatus,
    paired: !!pairing,
    establishment: pairing?.establishment || null,
    apiBaseUrl: pairing?.apiBaseUrl || null,
    printerConfigured: !!printer,
    printerConnected: printerStatus.connected,
    printerMessage: printerStatus.message,
  };
}

function notifyStatus() {
  if (!statusWindow || statusWindow.isDestroyed()) {
    return;
  }
  statusWindow.webContents.send('fomy:print-queue-status', getRuntimeStatus());
}

function setError(message) {
  runtimeStatus.lastError = message;
  notifyStatus();
}

/**
 * @param {string} apiBaseUrl
 * @param {string} token
 */
async function validatePairing(apiBaseUrl, token) {
  const url = `${apiBaseUrl}/estacao-impressao/${encodeURIComponent(token)}/config`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Pareamento inválido (HTTP ${response.status})${body ? `: ${body.slice(0, 120)}` : ''}`);
  }

  const data = await response.json();
  if (!data || !data.url_dados) {
    throw new Error('Resposta de pareamento inválida.');
  }

  return data;
}

/**
 * @param {string} apiBaseUrl
 * @param {string} token
 * @param {number[]} jobIds
 */
async function confirmJobs(apiBaseUrl, token, jobIds) {
  const url = `${apiBaseUrl}/estacao-impressao/${encodeURIComponent(token)}/confirmar`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ job_ids: jobIds }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao confirmar impressão (HTTP ${response.status})`);
  }

  const data = await response.json();
  if (!data || !data.success) {
    throw new Error('Servidor não confirmou a impressão.');
  }

  return data;
}

/**
 * @param {string} apiBaseUrl
 * @param {string} token
 * @param {number[]} jobIds
 */
async function releaseJobs(apiBaseUrl, token, jobIds) {
  const url = `${apiBaseUrl}/estacao-impressao/${encodeURIComponent(token)}/liberar`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ job_ids: jobIds }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao liberar job na fila (HTTP ${response.status})`);
  }

  const data = await response.json();
  if (!data || !data.success) {
    throw new Error('Servidor não liberou o job na fila.');
  }

  return data;
}

/** @param {string} cupomUrl */
async function fetchEscPosBuffer(cupomUrl) {
  const response = await fetch(cupomUrl, {
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
 * @param {Object} job
 * @param {string} apiBaseUrl
 * @param {string} token
 */
async function processJob(job, apiBaseUrl, token) {
  const escposUrl = job.cupom_url_escpos;
  if (!escposUrl) {
    throw new Error(`Job #${job.job_id} sem URL ESC/POS.`);
  }

  const printer = printerConfig.getPrinterConfig();
  const buffer = await fetchEscPosBuffer(escposUrl);
  await printerService.print(buffer, printer);
  await confirmJobs(apiBaseUrl, token, [job.job_id]);

  const label = `#${job.numero || job.invoice_id}`;
  runtimeStatus.lastPrintAt = Date.now();
  runtimeStatus.lastJobLabel = label;
  runtimeStatus.jobsPrintedSession += 1;
  runtimeStatus.lastError = null;
  notifyStatus();

  console.log(`[Fomy Desktop] Cupom impresso: pedido ${label}`);
}

async function pollOnce() {
  if (pollInFlight || printInFlight) {
    return;
  }

  const pairing = pairingConfig.getPairing();
  if (!pairing) {
    return;
  }

  const printer = printerConfig.getPrinterConfig();
  if (!printer) {
    setError('Configure a impressora no Fomy Desktop (Ctrl+Shift+P).');
    return;
  }

  pollInFlight = true;
  runtimeStatus.lastPollAt = Date.now();

  try {
    const urlDados = `${pairing.apiBaseUrl}/estacao-impressao/${encodeURIComponent(pairing.token)}/dados`;
    const response = await fetch(urlDados, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Poll da fila falhou (HTTP ${response.status})`);
    }

    const data = await response.json();
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];

    if (jobs.length === 0) {
      runtimeStatus.lastError = null;
      notifyStatus();
      return;
    }

    printInFlight = true;

    for (const job of jobs) {
      try {
        await processJob(job, pairing.apiBaseUrl, pairing.token);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao imprimir job';
        console.error('[Fomy Desktop] Erro no job:', message);
        setError(message);
        try {
          await releaseJobs(pairing.apiBaseUrl, pairing.token, [job.job_id]);
        } catch (releaseError) {
          const releaseMessage = releaseError instanceof Error ? releaseError.message : 'Falha ao liberar job';
          console.error('[Fomy Desktop] Liberar job:', releaseMessage);
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro no poll de impressão';
    console.error('[Fomy Desktop] Poll:', message);
    setError(message);
  } finally {
    pollInFlight = false;
    printInFlight = false;
  }
}

function start() {
  if (pollTimer) {
    return;
  }

  runtimeStatus.active = true;
  runtimeStatus.lastError = null;
  notifyStatus();

  pollOnce();
  pollTimer = setInterval(pollOnce, POLL_MS);
  console.log('[Fomy Desktop] Poll de impressão automática iniciado.');
}

function stop() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  runtimeStatus.active = false;
  notifyStatus();
  console.log('[Fomy Desktop] Poll de impressão automática parado.');
}

/**
 * @param {{ apiBaseUrl: string, token: string }} input
 */
async function savePairing(input) {
  const apiBaseUrl = String(input.apiBaseUrl || '').replace(/\/+$/, '');
  const token = String(input.token || '').trim();

  if (!apiBaseUrl) {
    throw new Error('Informe a URL da API.');
  }
  if (token.length !== 48) {
    throw new Error('Código de pareamento inválido (deve ter 48 caracteres).');
  }

  const validated = await validatePairing(apiBaseUrl, token);

  pairingConfig.setPairing({
    apiBaseUrl,
    token,
    establishment: validated.establishment || null,
    establishmentId: validated.establishment_id || null,
  });

  runtimeStatus.lastError = null;
  notifyStatus();
  start();

  return getRuntimeStatus();
}

function clearPairing() {
  pairingConfig.clearPairing();
  runtimeStatus.lastError = null;
  runtimeStatus.lastJobLabel = null;
  notifyStatus();
}

module.exports = {
  clearPairing,
  getRuntimeStatus,
  savePairing,
  setStatusWindow,
  start,
  stop,
  validatePairing,
};
