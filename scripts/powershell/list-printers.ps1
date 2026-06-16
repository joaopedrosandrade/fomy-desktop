$ErrorActionPreference = 'Stop'

try {
  $printers = Get-Printer | Select-Object Name, PortName, DriverName, PrinterStatus
  $printers | ConvertTo-Json -Compress
}
catch {
  @() | ConvertTo-Json -Compress
}
