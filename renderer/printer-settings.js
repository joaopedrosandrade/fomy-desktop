const api = window.fomyDesktop?.printer;

const statusDot = document.getElementById('status-dot');
const statusTitle = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');
const statusConfig = document.getElementById('status-config');
const feedback = document.getElementById('feedback');

const btSelect = document.getElementById('bt-select');
const btBaud = document.getElementById('bt-baud');
const netHost = document.getElementById('net-host');
const netPort = document.getElementById('net-port');
const winSelect = document.getElementById('win-select');

function showFeedback(message, type = 'success') {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
  feedback.classList.remove('hidden');
  setTimeout(() => feedback.classList.add('hidden'), 4000);
}

function formatConfig(config) {
  if (!config) return null;
  return JSON.stringify(config, null, 2);
}

function renderStatus(status) {
  const connected = Boolean(status?.connected);
  statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
  statusTitle.textContent = connected ? 'Conectada' : 'Não conectada';
  statusMessage.textContent = status?.message || '';

  if (status?.config) {
    statusConfig.textContent = formatConfig(status.config);
    statusConfig.classList.remove('hidden');
    applyConfigToForm(status.config);
  } else {
    statusConfig.classList.add('hidden');
    statusConfig.textContent = '';
  }
}

function applyConfigToForm(config) {
  if (!config) return;

  if (config.type === 'bluetooth' || config.type === 'serial') {
    activateTab('bluetooth');
    if (config.path) btSelect.value = config.path;
    if (config.baudRate) btBaud.value = String(config.baudRate);
  }

  if (config.type === 'network') {
    activateTab('network');
    netHost.value = config.host || '';
    netPort.value = config.port || 9100;
  }

  if (config.type === 'windows') {
    activateTab('windows');
    if (config.printerName) winSelect.value = config.printerName;
  }
}

function activateTab(tabName) {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`);
  });
}

async function loadBluetoothDevices() {
  btSelect.innerHTML = '<option value="">Carregando...</option>';
  const devices = await api.listBluetooth();

  if (!devices.length) {
    btSelect.innerHTML = '<option value="">Nenhum dispositivo Bluetooth encontrado</option>';
    return;
  }

  btSelect.innerHTML = '<option value="">Selecione...</option>';
  devices.forEach((device) => {
    const option = document.createElement('option');
    option.value = device.path;
    option.textContent = `${device.name} (${device.path})`;
    btSelect.appendChild(option);
  });
}

async function loadWindowsPrinters() {
  winSelect.innerHTML = '<option value="">Carregando...</option>';
  const { system } = await api.list();

  if (!system.length) {
    winSelect.innerHTML = '<option value="">Nenhuma impressora encontrada</option>';
    return;
  }

  winSelect.innerHTML = '<option value="">Selecione...</option>';
  system.forEach((printer) => {
    const option = document.createElement('option');
    option.value = printer.name;
    const typeLabel = printer.connectionType === 'bluetooth' ? ' [BT]' : '';
    option.textContent = `${printer.displayName || printer.name}${typeLabel}`;
    winSelect.appendChild(option);
  });
}

async function refreshStatus() {
  const status = await api.getStatus();
  renderStatus(status);
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab));
});

document.getElementById('bt-refresh').addEventListener('click', async () => {
  try {
    await loadBluetoothDevices();
    showFeedback('Lista Bluetooth atualizada');
  } catch (error) {
    showFeedback(error.message, 'error');
  }
});

document.getElementById('win-refresh').addEventListener('click', async () => {
  try {
    await loadWindowsPrinters();
    showFeedback('Lista de impressoras atualizada');
  } catch (error) {
    showFeedback(error.message, 'error');
  }
});

document.getElementById('bt-save').addEventListener('click', async () => {
  const path = btSelect.value;
  if (!path) {
    showFeedback('Selecione um dispositivo Bluetooth', 'error');
    return;
  }

  try {
    const options = { path };
    if (btBaud.value) options.baudRate = Number(btBaud.value);
    const result = await api.configureBluetooth(options);
    renderStatus(result.status);
    showFeedback('Impressora Bluetooth configurada');
  } catch (error) {
    showFeedback(error.message || 'Falha ao configurar Bluetooth', 'error');
  }
});

document.getElementById('net-save').addEventListener('click', async () => {
  const host = netHost.value.trim();
  if (!host) {
    showFeedback('Informe o endereço IP', 'error');
    return;
  }

  try {
    const config = {
      type: 'network',
      host,
      port: Number(netPort.value) || 9100,
    };
    const status = await api.saveConfig(config);
    renderStatus(status);
    showFeedback('Impressora de rede configurada');
  } catch (error) {
    showFeedback(error.message || 'Falha ao configurar rede', 'error');
  }
});

document.getElementById('win-save').addEventListener('click', async () => {
  const printerName = winSelect.value;
  if (!printerName) {
    showFeedback('Selecione uma impressora', 'error');
    return;
  }

  try {
    const result = await api.configureFromSystem(printerName);
    renderStatus(result.status);
    showFeedback('Impressora do Windows configurada');
  } catch (error) {
    showFeedback(error.message || 'Falha ao configurar impressora', 'error');
  }
});

document.getElementById('btn-test').addEventListener('click', async () => {
  try {
    const status = await api.test();
    renderStatus(status);
    await api.printText('--- TESTE FOMY ---\nImpressora OK\n\n');
    showFeedback('Teste enviado para a impressora');
  } catch (error) {
    showFeedback(error.message || 'Falha no teste de impressão', 'error');
  }
});

document.getElementById('btn-clear').addEventListener('click', async () => {
  try {
    const status = await api.clearConfig();
    renderStatus(status);
    showFeedback('Configuração removida');
  } catch (error) {
    showFeedback(error.message || 'Falha ao remover configuração', 'error');
  }
});

async function init() {
  if (!api) {
    statusTitle.textContent = 'Indisponível';
    statusMessage.textContent = 'API do desktop não encontrada.';
    return;
  }

  activateTab('bluetooth');
  await Promise.all([
    loadBluetoothDevices(),
    loadWindowsPrinters(),
    refreshStatus(),
  ]);

  api.onStatusChange((status) => renderStatus(status));
}

init();
