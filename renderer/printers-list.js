const api = window.fomyDesktop?.printer;

const listBluetooth = document.getElementById('list-bluetooth');
const listWindows = document.getElementById('list-windows');
const listSerial = document.getElementById('list-serial');
const feedback = document.getElementById('feedback');

function showFeedback(message, type = 'success') {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
  feedback.classList.remove('hidden');
  setTimeout(() => feedback.classList.add('hidden'), 3500);
}

function renderList(container, items, formatter) {
  if (!items.length) {
    container.innerHTML = '<li class="empty">Nenhuma encontrada</li>';
    container.classList.add('muted');
    return;
  }

  container.classList.remove('muted');
  container.innerHTML = items.map(formatter).join('');
}

async function loadPrinters() {
  if (!api) {
    showFeedback('API do desktop indisponível', 'error');
    return;
  }

  try {
    const [bluetooth, all] = await Promise.all([
      api.listBluetooth(),
      api.list(),
    ]);

    renderList(listBluetooth, bluetooth, (item) => (
      `<li><strong>${item.name || item.path}</strong><br><span class="muted">${item.path}${item.direction ? ` · ${item.direction}` : ''}</span></li>`
    ));

    renderList(listWindows, all.system || [], (item) => (
      `<li><strong>${item.displayName || item.name}</strong><br><span class="muted">${item.connectionType || 'windows'}${item.portName ? ` · ${item.portName}` : ''}</span></li>`
    ));

    renderList(listSerial, all.serial || [], (item) => (
      `<li><strong>${item.path}</strong></li>`
    ));
  } catch (error) {
    showFeedback(error.message || 'Falha ao listar impressoras', 'error');
  }
}

document.getElementById('btn-refresh').addEventListener('click', loadPrinters);
loadPrinters();

if (window.fomyDesktop?.events?.onPrintersListRefresh) {
  window.fomyDesktop.events.onPrintersListRefresh(loadPrinters);
}
