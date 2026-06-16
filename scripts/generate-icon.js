const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');

const assetsDir = path.join(__dirname, '..', 'assets');
const faviconPath = path.join(assetsDir, 'favicon.ico');
const iconIcoPath = path.join(assetsDir, 'icon.ico');
const iconPngPath = path.join(assetsDir, 'icon.png');
const exportScript = path.join(__dirname, 'export-favicon.ps1');
const sizes = [16, 32, 48, 256];

async function main() {
  if (!fs.existsSync(faviconPath)) {
    throw new Error(`Favicon não encontrado: ${faviconPath}`);
  }

  execSync(
    `powershell -NoProfile -ExecutionPolicy Bypass -File "${exportScript}"`,
    { stdio: 'inherit' },
  );

  const pngBuffers = sizes.map((size) =>
    fs.readFileSync(path.join(assetsDir, `icon-${size}.png`)),
  );

  fs.writeFileSync(iconIcoPath, await toIco(pngBuffers));
  fs.writeFileSync(iconPngPath, pngBuffers[3]);

  for (const size of sizes) {
    fs.unlinkSync(path.join(assetsDir, `icon-${size}.png`));
  }

  console.log('Ícones gerados:', iconIcoPath, iconPngPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
