const api = window.fomyDesktop?.update;

const currentEl = document.getElementById('current-version');
const newEl = document.getElementById('new-version');
const btnUpdate = document.getElementById('btn-update');
const btnRetry = document.getElementById('btn-retry');
const progressArea = document.getElementById('progress-area');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const errorText = document.getElementById('error-text');
const helpText = document.getElementById('help-text');

let downloading = false;

function showError(message) {
  errorText.textContent = message;
  errorText.classList.remove('hidden');
  btnRetry.classList.remove('hidden');
  btnUpdate.disabled = false;
  downloading = false;
}

function hideError() {
  errorText.classList.add('hidden');
  btnRetry.classList.add('hidden');
}

function setProgress(percent, transferred, total) {
  progressArea.classList.remove('hidden');
  progressFill.style.width = `${Math.round(percent)}%`;

  if (total > 0) {
    const mbDone = (transferred / 1024 / 1024).toFixed(1);
    const mbTotal = (total / 1024 / 1024).toFixed(1);
    progressText.textContent = `Baixando... ${mbDone} / ${mbTotal} MB (${Math.round(percent)}%)`;
  } else {
    progressText.textContent = `Baixando... ${Math.round(percent)}%`;
  }
}

async function startDownload() {
  if (!api || downloading) return;

  hideError();
  downloading = true;
  btnUpdate.disabled = true;
  btnUpdate.textContent = 'Baixando...';
  progressArea.classList.remove('hidden');

  try {
    await api.download();
  } catch (error) {
    showError(error.message || 'Falha ao baixar a atualização.');
    btnUpdate.textContent = 'Atualizar agora';
  }
}

async function startInstall() {
  if (!api || downloading) return;

  hideError();
  downloading = true;
  btnUpdate.disabled = true;
  btnUpdate.textContent = 'Instalando...';

  try {
    await api.install();
  } catch (error) {
    showError(error.message || 'Falha ao instalar a atualização.');
    btnUpdate.textContent = 'Instalar e reiniciar';
  }
}

async function init() {
  if (!api) {
    showError('Serviço de atualização indisponível.');
    return;
  }

  let updateReady = false;

  const info = await api.getInfo();
  currentEl.textContent = `v${info.currentVersion}`;
  newEl.textContent = `v${info.newVersion}`;

  api.onProgress((data) => {
    setProgress(data.percent || 0, data.transferred || 0, data.total || 0);
  });

  api.onReady(() => {
    updateReady = true;
    progressText.textContent = 'Download concluído! Clique em Instalar para continuar.';
    btnUpdate.disabled = false;
    btnUpdate.textContent = 'Instalar e reiniciar';
    downloading = false;
    helpText.classList.remove('hidden');
  });

  api.onError((message) => {
    showError(message);
    btnUpdate.textContent = updateReady ? 'Instalar e reiniciar' : 'Atualizar agora';
  });

  btnUpdate.addEventListener('click', () => {
    if (updateReady) {
      startInstall();
    } else {
      startDownload();
    }
  });
  btnRetry.addEventListener('click', startDownload);

  startDownload();
}

init();
