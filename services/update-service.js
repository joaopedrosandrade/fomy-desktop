const { autoUpdater } = require('electron-updater');
const { app, dialog, BrowserWindow, net } = require('electron');
const { loadUpdateAuth } = require('./update-auth');
const { isVersionOlder } = require('./version-utils');
const {
  getMandatoryWindow,
  isMandatoryWindowOpen,
  showMandatoryUpdateWindow,
} = require('../windows/mandatory-update-window');

/** @type {import('electron').BrowserWindow | null} */
let parentWindow = null;

let checking = false;
let updateReady = false;
let pendingUpdateVersion = null;
let manualCheck = false;
let mandatoryActive = false;

/** @type {{ currentVersion: string, newVersion: string } | null} */
let mandatoryInfo = null;

const UPDATE_FEED = {
  provider: 'github',
  owner: 'joaopedrosandrade',
  repo: 'fomy-desktop',
};

function setParentWindow(window) {
  parentWindow = window;
}

function getParentWindow() {
  if (parentWindow && !parentWindow.isDestroyed()) {
    return parentWindow;
  }
  return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
}

function getCurrentVersion() {
  return app.getVersion();
}

function getMandatoryUpdateInfo() {
  return mandatoryInfo || {
    currentVersion: getCurrentVersion(),
    newVersion: pendingUpdateVersion || getCurrentVersion(),
  };
}

function notifyMandatoryWindow(channel, data) {
  const win = getMandatoryWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

function getReleaseNotes(info) {
  const notes = info?.releaseNotes;
  if (!notes) return '';
  if (typeof notes === 'string') return notes.trim();
  if (Array.isArray(notes)) {
    return notes.map((item) => (typeof item === 'string' ? item : item.note || '')).join('\n').trim();
  }
  return '';
}

async function showMessage(title, message, detail, type = 'info') {
  const win = getParentWindow();
  const options = {
    type,
    title,
    message,
    detail: detail || undefined,
    buttons: ['OK'],
  };

  if (win) {
    return dialog.showMessageBox(win, options);
  }
  return dialog.showMessageBox(options);
}

function triggerMandatoryUpdate(info) {
  mandatoryActive = true;
  mandatoryInfo = {
    currentVersion: getCurrentVersion(),
    newVersion: info.version || pendingUpdateVersion,
  };

  console.log('[update] Atualização obrigatória:', mandatoryInfo);

  showMandatoryUpdateWindow(mandatoryInfo, parentWindow);
}

/**
 * Consulta a versão mais recente publicada no GitHub Releases.
 * @returns {Promise<string | null>}
 */
function fetchLatestVersionFromGitHub() {
  return new Promise((resolve) => {
    const url = `https://api.github.com/repos/${UPDATE_FEED.owner}/${UPDATE_FEED.repo}/releases/latest`;

    const request = net.request({
      method: 'GET',
      url,
      redirect: 'follow',
    });

    request.setHeader('Accept', 'application/vnd.github+json');
    request.setHeader('User-Agent', `Fomy-Desktop/${getCurrentVersion()}`);

    const auth = loadUpdateAuth();
    if (auth.token) {
      request.setHeader('Authorization', `token ${auth.token}`);
    }

    let body = '';

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        body += chunk.toString('utf8');
      });

      response.on('end', () => {
        if (response.statusCode && response.statusCode >= 400) {
          console.log('[update] GitHub API:', response.statusCode, body.slice(0, 200));
          resolve(null);
          return;
        }

        try {
          const json = JSON.parse(body);
          const tag = String(json.tag_name || '').replace(/^v/i, '');
          resolve(tag || null);
        } catch {
          resolve(null);
        }
      });
    });

    request.on('error', (error) => {
      console.error('[update] Falha na consulta GitHub:', error.message);
      resolve(null);
    });

    request.end();
  });
}

/**
 * @returns {Promise<{ required: boolean, version?: string, currentVersion: string, offline?: boolean }>}
 */
async function evaluateMandatoryUpdate() {
  const currentVersion = getCurrentVersion();

  if (!app.isPackaged) {
    return { required: false, currentVersion };
  }

  const latestVersion = await fetchLatestVersionFromGitHub();

  if (latestVersion && isVersionOlder(currentVersion, latestVersion)) {
    pendingUpdateVersion = latestVersion;

    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[update] Falha ao preparar download:', message);
    }

    triggerMandatoryUpdate({ version: latestVersion });
    return { required: true, version: latestVersion, currentVersion };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    const remoteVersion = result?.updateInfo?.version;
    const updateAvailable = Boolean(result?.isUpdateAvailable)
      || Boolean(result?.updateInfo && 'isUpdateAvailable' in result && result.isUpdateAvailable);

    if (pendingUpdateVersion && isVersionOlder(currentVersion, pendingUpdateVersion)) {
      return { required: true, version: pendingUpdateVersion, currentVersion };
    }

    if (updateAvailable && remoteVersion && isVersionOlder(currentVersion, remoteVersion)) {
      pendingUpdateVersion = remoteVersion;
      triggerMandatoryUpdate({ version: remoteVersion });
      return { required: true, version: remoteVersion, currentVersion };
    }

    return { required: false, currentVersion };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[update] Falha na verificação obrigatória:', message);
    return { required: false, currentVersion, offline: true };
  }
}

function isBenignError(message) {
  const text = message.toLowerCase();
  return text.includes('no published versions')
    || text.includes('404')
    || text.includes('not found')
    || text.includes('could not find')
    || text.includes('401')
    || text.includes('403')
    || text.includes('bad credentials');
}

function getUpdateErrorDetail(message) {
  const text = message.toLowerCase();

  if (text.includes('401') || text.includes('403') || text.includes('bad credentials')) {
    return 'O repositório GitHub não está acessível. Verifique a conexão ou configuração.';
  }

  return 'Não foi possível verificar atualizações. Verifique sua conexão com a internet.';
}

function registerUpdateEvents() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    checking = true;
    console.log('[update] Verificando atualizações...');
  });

  autoUpdater.on('update-available', (info) => {
    checking = false;
    pendingUpdateVersion = info.version;
    console.log('[update] Nova versão disponível:', info.version);

    // Sempre obrigatório — bloqueia o uso até atualizar
    triggerMandatoryUpdate(info);
  });

  autoUpdater.on('update-not-available', (info) => {
    checking = false;
    pendingUpdateVersion = null;
    console.log('[update] Sem atualizações. Versão:', info?.version || getCurrentVersion());

    if (manualCheck) {
      showMessage(
        'Verificar atualização',
        `Você já está na versão mais recente (${getCurrentVersion()}).`,
      );
      manualCheck = false;
    }
  });

  autoUpdater.on('error', (error) => {
    checking = false;
    const message = error instanceof Error ? error.message : String(error);
    const wasManual = manualCheck;
    manualCheck = false;

    if (mandatoryActive || isMandatoryWindowOpen()) {
      notifyMandatoryWindow('fomy:update:error', message);
      return;
    }

    if (isBenignError(message)) {
      console.log('[update] Falha ao acessar releases:', message);
      if (wasManual) {
        showMessage(
          'Verificar atualização',
          'Não foi possível verificar atualizações.',
          getUpdateErrorDetail(message),
          'warning',
        );
      }
      return;
    }

    console.error('[update]', message);
    if (wasManual) {
      showMessage(
        'Verificar atualização',
        'Não foi possível verificar atualizações no momento.',
        'Verifique sua conexão com a internet e tente novamente.',
        'warning',
      );
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    const win = getParentWindow();
    if (win && !win.isDestroyed()) {
      win.setProgressBar(progress.percent / 100);
    }

    notifyMandatoryWindow('fomy:update:progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    updateReady = true;
    const win = getParentWindow();
    if (win && !win.isDestroyed()) {
      win.setProgressBar(-1);
    }

    notifyMandatoryWindow('fomy:update:ready', {
      version: pendingUpdateVersion,
    });

    // Reinicia automaticamente após download na tela obrigatória
    if (mandatoryActive || isMandatoryWindowOpen()) {
      setTimeout(() => {
        autoUpdater.quitAndInstall(false, true);
      }, 1500);
      return;
    }

    const options = {
      type: 'info',
      title: 'Atualização pronta',
      message: `A versão ${pendingUpdateVersion || ''} foi baixada.`,
      detail: 'O Fomy será reiniciado para aplicar a nova versão.',
      buttons: ['Reiniciar agora', 'Depois'],
      defaultId: 0,
      cancelId: 1,
    };

    const promise = win
      ? dialog.showMessageBox(win, options)
      : dialog.showMessageBox(options);

    promise.then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });
}

function configureUpdateFeed() {
  if (!app.isPackaged) return;

  const auth = loadUpdateAuth();
  const feed = {
    provider: UPDATE_FEED.provider,
    owner: UPDATE_FEED.owner,
    repo: UPDATE_FEED.repo,
    private: auth.private,
  };

  if (auth.token) {
    feed.token = auth.token;
  }

  autoUpdater.setFeedURL(feed);

  if (auth.token) {
    autoUpdater.requestHeaders = {
      ...autoUpdater.requestHeaders,
      Authorization: `token ${auth.token}`,
    };
  }

  console.log('[update] Feed:', `github://${UPDATE_FEED.owner}/${UPDATE_FEED.repo}`);
  console.log('[update] Versão instalada:', getCurrentVersion());
}

/**
 * Verifica se há atualização obrigatória antes de liberar o app.
 * @returns {Promise<{ required: boolean, version?: string, currentVersion: string }>}
 */
async function checkMandatoryUpdateOnStartup() {
  if (checking && mandatoryActive) {
    return {
      required: true,
      version: pendingUpdateVersion,
      currentVersion: getCurrentVersion(),
    };
  }

  return evaluateMandatoryUpdate();
}

/**
 * Verificação de segurança após a janela principal carregar.
 * @param {import('electron').BrowserWindow} window
 */
async function recheckMandatoryUpdate(window) {
  if (!app.isPackaged || mandatoryActive || isMandatoryWindowOpen()) return;

  const currentVersion = getCurrentVersion();
  const latestVersion = await fetchLatestVersionFromGitHub();

  if (latestVersion && isVersionOlder(currentVersion, latestVersion)) {
    setParentWindow(window);
    pendingUpdateVersion = latestVersion;

    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[update] Falha ao preparar download:', message);
    }

    triggerMandatoryUpdate({ version: latestVersion });
  }
}

async function downloadMandatoryUpdate() {
  if (updateReady) {
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  }

  try {
    if (!pendingUpdateVersion) {
      await autoUpdater.checkForUpdates();
    }
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    notifyMandatoryWindow('fomy:update:error', message);
    throw error;
  }
}

/**
 * @param {{ silent?: boolean }} [options]
 */
async function checkForUpdates(options = {}) {
  if (!app.isPackaged) {
    if (!options.silent) {
      await showMessage(
        'Verificar atualização',
        'Atualizações automáticas estão disponíveis apenas na versão instalada.',
        'Use o instalador (.exe) para testar o fluxo de atualização.',
      );
    }
    return { ok: false, reason: 'development' };
  }

  if (checking) {
    if (!options.silent) {
      await showMessage('Verificar atualização', 'Já existe uma verificação em andamento.');
    }
    return { ok: false, reason: 'checking' };
  }

  manualCheck = !options.silent;
  pendingUpdateVersion = null;

  try {
    const result = await autoUpdater.checkForUpdates();

    if (pendingUpdateVersion && isVersionOlder(getCurrentVersion(), pendingUpdateVersion)) {
      return { ok: true, upToDate: false, version: pendingUpdateVersion };
    }

    manualCheck = false;
    const upToDate = !result?.isUpdateAvailable;
    return {
      ok: true,
      upToDate,
      version: result?.updateInfo?.version || getCurrentVersion(),
    };
  } catch (error) {
    manualCheck = false;
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[update]', message);
    return { ok: false, reason: 'error', error: message };
  }
}

function schedulePeriodicCheck() {
  if (!app.isPackaged) return;

  // Verificação periódica a cada 30 minutos com o app aberto
  setInterval(() => {
    checkForUpdates({ silent: true });
  }, 30 * 60 * 1000);
}

function initializeUpdater() {
  configureUpdateFeed();
  registerUpdateEvents();
  schedulePeriodicCheck();
}

module.exports = {
  checkForUpdates,
  checkMandatoryUpdateOnStartup,
  downloadMandatoryUpdate,
  getCurrentVersion,
  getMandatoryUpdateInfo,
  initializeUpdater,
  isUpdateReady: () => updateReady,
  recheckMandatoryUpdate,
  setParentWindow,
  UPDATE_FEED,
};
