const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const execFileAsync = promisify(execFile);
const PRINT_TIMEOUT_MS = 30000;

function getScriptDir() {
  const relativeDir = path.join('scripts', 'powershell');

  if (app.isPackaged) {
    const unpackedDir = path.join(
      path.dirname(app.getAppPath()),
      'app.asar.unpacked',
      relativeDir,
    );

    if (fs.existsSync(unpackedDir)) {
      return unpackedDir;
    }
  }

  return path.join(__dirname, '..', relativeDir);
}

/**
 * @param {string} scriptName
 */
function getScriptPath(scriptName) {
  const scriptPath = path.join(getScriptDir(), scriptName);

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script PowerShell não encontrado: ${scriptPath}`);
  }

  return scriptPath;
}

/**
 * @param {string} scriptName
 * @param {string[]} args
 */
async function runPowerShell(scriptName, args = []) {
  const scriptPath = getScriptPath(scriptName);
  const { stdout, stderr } = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    scriptPath,
    ...args,
  ], { timeout: PRINT_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 });

  const output = stdout.trim();
  if (!output) {
    if (stderr.trim()) {
      throw new Error(stderr.trim());
    }
    return null;
  }

  try {
    return JSON.parse(output);
  } catch {
    return output;
  }
}

/** @param {Buffer} buffer @param {string} printerName */
async function printRawWindows(buffer, printerName) {
  const result = await runPowerShell('print-raw-windows.ps1', [
    '-PrinterName',
    printerName,
    '-Base64Data',
    buffer.toString('base64'),
  ]);

  if (result && result.ok === false) {
    throw new Error(result.error || 'Falha ao imprimir no Windows');
  }
}

/** @param {Buffer} buffer @param {string} portPath @param {number} baudRate */
async function printSerial(buffer, portPath, baudRate) {
  const result = await runPowerShell('print-serial.ps1', [
    '-Port',
    portPath,
    '-BaudRate',
    String(baudRate),
    '-Base64Data',
    buffer.toString('base64'),
  ]);

  if (result && result.ok === false) {
    throw new Error(result.error || 'Falha ao imprimir na porta serial');
  }
}

async function listWindowsPrinters() {
  const result = await runPowerShell('list-printers.ps1');
  return Array.isArray(result) ? result : [];
}

async function listSerialPorts() {
  const result = await runPowerShell('list-serial-ports.ps1');
  return Array.isArray(result) ? result : [];
}

async function listBluetoothPrinters() {
  const result = await runPowerShell('list-bluetooth-printers.ps1');
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

module.exports = {
  listBluetoothPrinters,
  listSerialPorts,
  listWindowsPrinters,
  printRawWindows,
  printSerial,
};
