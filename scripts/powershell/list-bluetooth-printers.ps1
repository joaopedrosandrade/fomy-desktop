$ErrorActionPreference = 'Stop'

try {
  $devices = Get-CimInstance -ClassName Win32_PnPEntity |
    Where-Object { $_.Name -match '\(COM\d+\)' } |
    ForEach-Object {
      $port = $null
      if ($_.Name -match '\((COM\d+)\)') {
        $port = $matches[1]
      }

      $name = $_.Name
      $isBluetooth = ($name -match 'Bluetooth|BT|BTH|Serial Port') -and ($name -notmatch 'Intel|Realtek|UART')

      if (-not $isBluetooth) { return }

      @{
        name = ($name -replace '\s*\(COM\d+\)\s*$', '').Trim()
        path = $port
        fullName = $name
        manufacturer = $_.Manufacturer
        connectionType = 'bluetooth'
      }
    }

  if ($null -eq $devices -or $devices.Count -eq 0) {
    '[]'
  }
  else {
    @($devices) | ConvertTo-Json -Compress
  }
}
catch {
  '[]'
}
