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
function parsePowerShellOutput(stdout, stderr) {
  const output = (stdout || '').trim();
  if (!output) {
    if (stderr && stderr.trim()) {
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

async function runPowerShell(scriptName, args = []) {
  const scriptPath = getScriptPath(scriptName);

  try {
    const { stdout, stderr } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      ...args,
    ], { timeout: PRINT_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 });

    return parsePowerShellOutput(stdout, stderr);
  } catch (error) {
    // Quando o script faz `exit 1`, o execFile rejeita mas o stdout ainda
    // contém o JSON com a mensagem de erro real. Tentamos recuperá-la.
    if (error && typeof error.stdout === 'string') {
      const parsed = parsePowerShellOutput(error.stdout, error.stderr);
      if (parsed && typeof parsed === 'object' && parsed.error) {
        return parsed;
      }
      if (parsed) {
        return parsed;
      }
    }

    if (error && typeof error.stderr === 'string' && error.stderr.trim()) {
      throw new Error(error.stderr.trim());
    }

    throw error;
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

/**
 * Normaliza o caminho da porta COM para o formato de device do Windows.
 * Ex.: "COM3" -> "\\.\COM3" (necessário para COM10+).
 * @param {string} portPath
 */
function toComDevicePath(portPath) {
  const name = portPath.toUpperCase().replace(/[:\\.]/g, '').trim();
  return `\\\\.\\${name}`;
}

/**
 * Configura a porta serial (baud rate etc.) usando o comando interno `mode`.
 * É best-effort: portas Bluetooth SPP geralmente ignoram o baud rate, então
 * uma falha aqui não impede a escrita.
 * @param {string} portPath
 * @param {number} baudRate
 */
async function configureSerialPort(portPath, baudRate) {
  const name = portPath.toUpperCase().replace(/[:\\.]/g, '').trim();
  try {
    await execFileAsync(
      'mode.com',
      [`${name}:`, `BAUD=${baudRate}`, 'PARITY=n', 'DATA=8', 'STOP=1', 'to=on', 'xon=off', 'odsr=off', 'octs=off', 'dtr=on', 'rts=on'],
      { timeout: 8000, windowsHide: true },
    );
  } catch {
    // Ignora: muitas portas Bluetooth não suportam o comando mode.
  }
}

/**
 * Escreve dados brutos diretamente no device da porta COM, sem depender de
 * scripts PowerShell (que são bloqueados por antivírus) nem de módulos nativos.
 * @param {Buffer} buffer
 * @param {string} portPath
 * @param {number} baudRate
 */
async function printSerial(buffer, portPath, baudRate) {
  await configureSerialPort(portPath, baudRate);

  const devicePath = toComDevicePath(portPath);
  let fileHandle = null;

  try {
    fileHandle = await fs.promises.open(devicePath, 'r+');
  } catch (openError) {
    // Algumas portas só aceitam abertura somente-escrita.
    try {
      fileHandle = await fs.promises.open(devicePath, 'w');
    } catch {
      const msg = openError && openError.code === 'EBUSY'
        ? `A porta ${portPath} está em uso por outro programa.`
        : openError && openError.code === 'ENOENT'
          ? `A porta ${portPath} não existe ou não está disponível.`
          : `Não foi possível abrir a porta ${portPath}: ${openError.message}`;
      throw new Error(msg);
    }
  }

  try {
    await fileHandle.write(buffer);
    if (typeof fileHandle.datasync === 'function') {
      try {
        await fileHandle.datasync();
      } catch {
        // datasync pode não ser suportado em devices; ignora.
      }
    }
    // Pequena pausa para garantir o flush físico antes de fechar.
    await new Promise((resolve) => setTimeout(resolve, 250));
  } finally {
    await fileHandle.close();
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
