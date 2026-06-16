$ErrorActionPreference = 'Stop'

try {
  $ports = [System.IO.Ports.SerialPort]::GetPortNames()
  $result = @()

  foreach ($portName in $ports) {
    $result += @{
      path = $portName
      manufacturer = $null
      serialNumber = $null
    }
  }

  $result | ConvertTo-Json -Compress
}
catch {
  '[]'
}
