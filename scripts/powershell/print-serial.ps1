param(
  [Parameter(Mandatory = $true)]
  [string]$Port,

  [Parameter(Mandatory = $true)]
  [int]$BaudRate,

  [Parameter(Mandatory = $true)]
  [string]$Base64Data
)

$ErrorActionPreference = 'Stop'

try {
  $bytes = [Convert]::FromBase64String($Base64Data)
  $port = New-Object System.IO.Ports.SerialPort $Port, $BaudRate
  $port.ReadTimeout = 5000
  $port.WriteTimeout = 10000
  $port.Open()

  try {
    $port.Write($bytes, 0, $bytes.Length)
    Start-Sleep -Milliseconds 200
  }
  finally {
    $port.Close()
    $port.Dispose()
  }

  @{ ok = $true } | ConvertTo-Json -Compress
}
catch {
  @{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
  exit 1
}
