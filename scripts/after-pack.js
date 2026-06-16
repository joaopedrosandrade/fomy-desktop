const path = require('path');
const rcedit = require('rcedit');

/** @param {import('app-builder-lib').AfterPackContext} context */
exports.default = async function afterPack(context) {
  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const exePath = path.join(context.appOutDir, exeName);
  const iconPath = path.join(context.packager.projectDir, 'assets', 'icon.ico');

  await rcedit(exePath, { icon: iconPath });
};
