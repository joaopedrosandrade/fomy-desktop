const net = require('net');
const windowsPrint = require('./windows-print');

/** @typedef {import('./printer-config').PrinterConfig} PrinterConfig */

/** @type {{ connected: boolean, message: string, config: PrinterConfig | null }} */
let status = {
  connected: false,
  message: 'Nenhuma impressora configurada',
  config: null,
};

const PRINT_TIMEOUT_MS = 15000;
const DEFAULT_NETWORK_PORT = 9100;
const DEFAULT_BAUD_RATE = 9600;
const BLUETOOTH_BAUD_RATES = [9600, 115200, 38400, 19200];

function getStatus() {
  return { ...status };
}

/** @param {boolean} connected @param {string} message @param {PrinterConfig | null} config */
function setStatus(connected, message, config = status.config) {
  status = { connected, message, config };
  return getStatus();
}

/**
 * @param {string} host
 * @param {number} port
 */
function testNetworkConnection(host, port = DEFAULT_NETWORK_PORT) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };

    socket.setTimeout(PRINT_TIMEOUT_MS);
    socket.on('timeout', () => finish(new Error(`Timeout ao conectar em ${host}:${port}`)));
    socket.on('error', (error) => finish(error));
    socket.connect(port, host, () => finish());
  });
}

/**
 * @param {Buffer} buffer
 * @param {string} host
 * @param {number} port
 */
function printViaNetwork(buffer, host, port = DEFAULT_NETWORK_PORT) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };

    socket.setTimeout(PRINT_TIMEOUT_MS);
    socket.on('timeout', () => finish(new Error(`Timeout ao conectar em ${host}:${port}`)));
    socket.on('error', (error) => finish(error));
    socket.connect(port, host, () => {
      socket.write(buffer, (writeError) => {
        if (writeError) {
          finish(writeError);
          return;
        }
        socket.end(() => finish());
      });
    });
  });
}

/** @param {PrinterConfig} config */
async function testConnection(config) {
  const testBuffer = Buffer.from([0x1b, 0x40]);

  switch (config.type) {
    case 'network':
      await testNetworkConnection(config.host, config.port || DEFAULT_NETWORK_PORT);
      return setStatus(true, `Conectado em ${config.host}:${config.port || DEFAULT_NETWORK_PORT}`, config);

    case 'windows': {
      const printers = await windowsPrint.listWindowsPrinters();
      const found = printers.some((item) => item.Name === config.printerName);
      if (!found) {
        return setStatus(false, `Impressora "${config.printerName}" não encontrada no Windows`, config);
      }
      await windowsPrint.printRawWindows(testBuffer, config.printerName);
      return setStatus(true, `Conectado à impressora "${config.printerName}"`, config);
    }

    case 'serial':
    case 'bluetooth': {
      const ports = await windowsPrint.listSerialPorts();
      const portPath = config.path.toUpperCase();
      const found = ports.some((item) => item.path.toUpperCase() === portPath);
      if (!found) {
        return setStatus(false, `Porta Bluetooth "${config.path}" não encontrada. Verifique se está pareada.`, config);
      }
      await windowsPrint.printSerial(testBuffer, portPath, config.baudRate || DEFAULT_BAUD_RATE);
      const label = config.deviceName || config.path;
      return setStatus(true, `Bluetooth conectado: ${label} (${portPath})`, config);
    }

    default:
      return setStatus(false, 'Tipo de impressora inválido', config);
  }
}

/** @param {PrinterConfig} config */
async function connect(config) {
  try {
    return await testConnection(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao conectar com a impressora';
    return setStatus(false, message, config);
  }
}

async function disconnect() {
  return setStatus(false, 'Desconectado', null);
}

/** @param {import('electron').WebContents | null} webContents */
async function listPrinters(webContents) {
  const systemPrinters = webContents
    ? await webContents.getPrintersAsync()
    : [];

  const windowsPrinters = await windowsPrint.listWindowsPrinters();
  const serialPorts = await windowsPrint.listSerialPorts();
  const bluetoothDevices = await windowsPrint.listBluetoothPrinters();

  const portByName = new Map(
    windowsPrinters.map((item) => [item.Name, item.PortName]),
  );

  return {
    system: systemPrinters.map((item) => ({
      name: item.name,
      displayName: item.displayName,
      description: item.description,
      isDefault: item.isDefault,
      status: item.status,
      portName: portByName.get(item.name) || null,
      connectionType: inferConnectionType(item.name, item.description, portByName.get(item.name)),
    })),
    bluetooth: bluetoothDevices.map((item) => ({
      name: item.name,
      path: item.path,
      fullName: item.fullName,
      manufacturer: item.manufacturer,
      connectionType: 'bluetooth',
    })),
    serial: serialPorts.map((item) => ({
      path: item.path,
      manufacturer: item.manufacturer,
      serialNumber: item.serialNumber,
      connectionType: 'bluetooth',
    })),
  };
}

/** @param {string} name @param {string} [description] @param {string} [portName] */
function inferConnectionType(name, description, portName) {
  const text = `${name} ${description || ''} ${portName || ''}`.toLowerCase();
  if (text.includes('bluetooth') || text.includes('bt') || (portName && portName.toUpperCase().startsWith('COM'))) {
    return 'bluetooth';
  }
  if (text.includes('ip_') || text.includes('tcp') || text.includes('network') || text.includes('wlan')) {
    return 'network';
  }
  return 'usb';
}

/**
 * @param {Buffer} buffer
 * @param {PrinterConfig | null} [config]
 */
async function print(buffer, config = status.config) {
  if (!config) {
    throw new Error('Nenhuma impressora configurada. Configure a impressora no desktop primeiro.');
  }

  switch (config.type) {
    case 'network':
      await printViaNetwork(buffer, config.host, config.port || DEFAULT_NETWORK_PORT);
      break;
    case 'windows':
      await windowsPrint.printRawWindows(buffer, config.printerName);
      break;
    case 'serial':
    case 'bluetooth':
      await windowsPrint.printSerial(buffer, config.path, config.baudRate || DEFAULT_BAUD_RATE);
      break;
    default:
      throw new Error('Tipo de impressora inválido');
  }

  return { ok: true };
}

/** @param {PrinterConfig | null} config */
async function autoConnect(config) {
  if (!config) {
    return setStatus(false, 'Nenhuma impressora configurada', null);
  }

  return connect(config);
}

/** @param {string} portName */
function configFromPortName(portName) {
  if (!portName) return null;

  const ipMatch = portName.match(/^IP[_\s-]?([\d.]+)$/i);
  if (ipMatch) {
    return { type: 'network', host: ipMatch[1], port: DEFAULT_NETWORK_PORT };
  }

  if (/^COM\d+$/i.test(portName)) {
    return { type: 'serial', path: portName.toUpperCase(), baudRate: DEFAULT_BAUD_RATE };
  }

  return null;
}

/**
 * Configura automaticamente com base no nome da impressora instalada no Windows.
 * @param {string} printerName
 */
async function configureFromSystemPrinter(printerName) {
  const printers = await windowsPrint.listWindowsPrinters();
  const printer = printers.find((item) => item.Name === printerName);

  if (!printer) {
    throw new Error(`Impressora "${printerName}" não encontrada no Windows`);
  }

  const portConfig = configFromPortName(printer.PortName);
  if (portConfig?.type === 'network') {
    return { ...portConfig, printerName };
  }
  if (portConfig?.type === 'serial') {
    return { ...portConfig, printerName };
  }

  return { type: 'windows', printerName };
}

/**
 * @param {{ path?: string, name?: string, baudRate?: number }} [options]
 */
async function configureBluetooth(options = {}) {
  const bluetoothDevices = await windowsPrint.listBluetoothPrinters();
  const searchPath = options.path?.toUpperCase();
  const searchName = options.name?.toLowerCase();

  let device = null;

  if (searchPath) {
    device = bluetoothDevices.find((item) => item.path.toUpperCase() === searchPath)
      || { path: searchPath, name: searchPath };
  } else if (searchName) {
    device = bluetoothDevices.find((item) => (
      item.name.toLowerCase().includes(searchName)
      || item.fullName.toLowerCase().includes(searchName)
    ));
  } else if (bluetoothDevices.length === 1) {
    device = bluetoothDevices[0];
  }

  if (!device) {
    if (bluetoothDevices.length === 0) {
      throw new Error(
        'Nenhuma impressora Bluetooth encontrada. Pareie a impressora em Configurações > Bluetooth do Windows e tente novamente.',
      );
    }
    throw new Error(
      `Múltiplas impressoras Bluetooth encontradas (${bluetoothDevices.length}). Informe o nome ou a porta COM.`,
    );
  }

  const baudRates = options.baudRate ? [options.baudRate] : BLUETOOTH_BAUD_RATES;
  const testBuffer = Buffer.from([0x1b, 0x40]);
  let workingBaudRate = null;
  let lastError = null;

  for (const baudRate of baudRates) {
    try {
      await windowsPrint.printSerial(testBuffer, device.path, baudRate);
      workingBaudRate = baudRate;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!workingBaudRate) {
    const message = lastError instanceof Error ? lastError.message : 'Falha na comunicação';
    throw new Error(
      `Não foi possível conectar na ${device.path}. Verifique se a impressora está ligada, pareada e próxima ao PC. (${message})`,
    );
  }

  return {
    type: 'bluetooth',
    path: device.path,
    baudRate: workingBaudRate,
    deviceName: device.name,
  };
}

async function listBluetoothPrinters() {
  return windowsPrint.listBluetoothPrinters();
}

module.exports = {
  autoConnect,
  configureBluetooth,
  configureFromSystemPrinter,
  connect,
  disconnect,
  getStatus,
  listBluetoothPrinters,
  listPrinters,
  print,
  testConnection,
};
