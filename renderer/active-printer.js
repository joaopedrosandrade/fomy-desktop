const api = window.fomyDesktop?.printer;

const statusDot = document.getElementById('status-dot');
const statusTitle = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');
const statusConfig = document.getElementById('status-config');
const feedback = document.getElementById('feedback');

function showFeedback(message, type = 'success') {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
  feedback.classList.remove('hidden');
  setTimeout(() => feedback.classList.add('hidden'), 3500);
}

function formatConfig(config) {
  if (!config) return null;
  return JSON.stringify(config, null, 2);
}

function describeConfig(config) {
  if (!config) return 'Nenhuma impressora configurada';

  switch (config.type) {
    case 'bluetooth':
      return `${config.deviceName || config.path} (${config.path}, ${config.baudRate} baud)`;
    case 'serial':
      return `${config.path} (${config.baudRate || 9600} baud)`;
    case 'network':
      return `${config.host}:${config.port || 9100}`;
    case 'windows':
      return config.printerName;
    default:
      return 'Configuração desconhecida';
  }
}

function renderStatus(status) {
  const connected = Boolean(status?.connected);
  statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  statusTitle.textContent = connected ? 'Ativa e conectada' : 'Não conectada';
  statusMessage.textContent = status?.config
    ? describeConfig(status.config)
    : (status?.message || 'Nenhuma impressora configurada');

  if (status?.config) {
    statusConfig.textContent = formatConfig(status.config);
    statusConfig.classList.remove('hidden');
  } else {
    statusConfig.classList.add('hidden');
    statusConfig.textContent = '';
  }
}

async function refreshStatus() {
  if (!api) {
    statusTitle.textContent = 'Indisponível';
    statusMessage.textContent = 'API do desktop não encontrada.';
    return;
  }

  const status = await api.getStatus();
  renderStatus(status);
}

document.getElementById('btn-test').addEventListener('click', async () => {
  try {
    await api.test();
    await api.printText('--- TESTE FOMY ---\nImpressora ativa OK\n\n');
    showFeedback('Teste enviado para a impressora');
    await refreshStatus();
  } catch (error) {
    showFeedback(error.message || 'Falha no teste', 'error');
  }
});

document.getElementById('btn-configure').addEventListener('click', () => {
  if (window.fomyDesktop?.system?.openPrinterSettings) {
    window.fomyDesktop.system.openPrinterSettings();
  }
});

document.getElementById('btn-clear').addEventListener('click', async () => {
  try {
    const status = await api.clearConfig();
    renderStatus(status);
    showFeedback('Impressora removida');
  } catch (error) {
    showFeedback(error.message || 'Falha ao remover', 'error');
  }
});

refreshStatus();

if (api?.onStatusChange) {
  api.onStatusChange(renderStatus);
}

if (window.fomyDesktop?.events?.onActivePrinterRefresh) {
  window.fomyDesktop.events.onActivePrinterRefresh(refreshStatus);
}
