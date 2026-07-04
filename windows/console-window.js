/**
 * Abre o DevTools destacado para suporte técnico.
 * @param {import('electron').BrowserWindow | null | undefined} sourceWindow
 */
function openConsoleWindow(sourceWindow) {
  const target = sourceWindow && !sourceWindow.isDestroyed()
    ? sourceWindow
    : require('electron').BrowserWindow.getFocusedWindow()
      || require('electron').BrowserWindow.getAllWindows()[0];

  if (!target || target.isDestroyed()) {
    return null;
  }

  if (target.webContents.isDevToolsOpened()) {
    target.webContents.devToolsWebContents?.focus();
    return target;
  }

  target.webContents.openDevTools({ mode: 'detach' });
  return target;
}

module.exports = {
  openConsoleWindow,
};
