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
      $deviceId = $_.PNPDeviceID
      $isBluetooth = ($name -match 'Bluetooth|BT|BTH|Serial Port' -or $deviceId -match 'BTHENUM') -and ($name -notmatch 'Intel|Realtek|UART')

      if (-not $isBluetooth) { return }

      # No Bluetooth SPP o Windows cria duas portas: a de SAÍDA (cliente, com
      # DEV_<endereço> no PNPDeviceID) aceita escrita; a de ENTRADA (LOCALMFG)
      # serve apenas para receber conexões e NÃO deve ser usada para imprimir.
      $direction = 'unknown'
      if ($deviceId -match 'LOCALMFG') {
        $direction = 'incoming'
      }
      elseif ($deviceId -match 'DEV_') {
        $direction = 'outgoing'
      }

      @{
        name = ($name -replace '\s*\(COM\d+\)\s*$', '').Trim()
        path = $port
        fullName = $name
        manufacturer = $_.Manufacturer
        deviceId = $deviceId
        direction = $direction
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
