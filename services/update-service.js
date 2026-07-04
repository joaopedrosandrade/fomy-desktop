const { autoUpdater } = require('electron-updater');
const { app, dialog, BrowserWindow } = require('electron');

/** @type {import('electron').BrowserWindow | null} */
let parentWindow = null;

let checking = false;
let updateReady = false;
let pendingUpdateVersion = null;
let manualCheck = false;

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

async function showUpdateAvailable(info) {
  const win = getParentWindow();
  const version = info.version || 'nova';
  const notes = getReleaseNotes(info);
  const options = {
    type: 'info',
    title: 'Atualização disponível',
    message: `Uma nova versão do Fomy está disponível (${version}).`,
    detail: [
      `Versão atual: ${getCurrentVersion()}`,
      notes ? `\nNovidades:\n${notes}` : '',
      '\nDeseja baixar e instalar agora? O app será reiniciado ao concluir.',
    ].filter(Boolean).join('\n'),
    buttons: ['Baixar e instalar', 'Depois'],
    defaultId: 0,
    cancelId: 1,
  };

  const result = win
    ? await dialog.showMessageBox(win, options)
    : await dialog.showMessageBox(options);

  if (result.response === 0) {
    autoUpdater.downloadUpdate();
  }
}

function isBenignError(message) {
  const text = message.toLowerCase();
  return text.includes('no published versions')
    || text.includes('404')
    || text.includes('not found')
    || text.includes('could not find');
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
    showUpdateAvailable(info);
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

    if (isBenignError(message)) {
      console.log('[update] Nenhum release publicado ainda.');
      if (wasManual) {
        showMessage(
          'Verificar atualização',
          'Nenhuma versão publicada encontrada.',
          'Publique a primeira release no GitHub (ex.: v1.0.0) para habilitar atualizações automáticas.',
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
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateReady = true;
    pendingUpdateVersion = info?.version || pendingUpdateVersion;
    const win = getParentWindow();
    if (win && !win.isDestroyed()) {
      win.setProgressBar(-1);
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

  autoUpdater.setFeedURL({
    provider: UPDATE_FEED.provider,
    owner: UPDATE_FEED.owner,
    repo: UPDATE_FEED.repo,
  });

  console.log('[update] Feed:', `github://${UPDATE_FEED.owner}/${UPDATE_FEED.repo}`);
  console.log('[update] Versão instalada:', getCurrentVersion());
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
    const remoteVersion = result?.updateInfo?.version;

    if (pendingUpdateVersion && pendingUpdateVersion !== getCurrentVersion()) {
      return { ok: true, upToDate: false, version: pendingUpdateVersion };
    }

    manualCheck = false;
    return {
      ok: true,
      upToDate: true,
      version: remoteVersion || getCurrentVersion(),
    };
  } catch (error) {
    manualCheck = false;
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[update]', message);
    return { ok: false, reason: 'error', error: message };
  }
}

function scheduleAutoCheck() {
  if (!app.isPackaged) return;

  setTimeout(() => {
    checkForUpdates({ silent: true });
  }, 8000);

  // Verificação periódica a cada 4 horas com o app aberto.
  setInterval(() => {
    checkForUpdates({ silent: true });
  }, 4 * 60 * 60 * 1000);
}

function initializeUpdater() {
  configureUpdateFeed();
  registerUpdateEvents();
  scheduleAutoCheck();
}

module.exports = {
  checkForUpdates,
  getCurrentVersion,
  initializeUpdater,
  isUpdateReady: () => updateReady,
  setParentWindow,
  UPDATE_FEED,
};
