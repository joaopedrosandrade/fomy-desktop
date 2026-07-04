# Publica uma nova versão do Fomy Desktop no GitHub Releases.
# Uso: .\scripts\publish-release.ps1 -Version 1.0.1
# Requer: $env:GH_TOKEN com token do GitHub (escopo repo).

param(
  [Parameter(Mandatory = $true)]
  [string]$Version
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:GH_TOKEN) {
  Write-Host ''
  Write-Host 'GH_TOKEN nao definido.' -ForegroundColor Yellow
  Write-Host 'Crie um token em https://github.com/settings/tokens (escopo repo) e execute:' -ForegroundColor Yellow
  Write-Host '  $env:GH_TOKEN = "seu_token"' -ForegroundColor Cyan
  Write-Host ''
  exit 1
}

$packageJson = Get-Content 'package.json' -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version

if ($currentVersion -ne $Version) {
  Write-Host "Atualizando package.json: $currentVersion -> $Version" -ForegroundColor Cyan
  $packageJson.version = $Version
  $packageJson | ConvertTo-Json -Depth 10 | Set-Content 'package.json' -Encoding UTF8
}

Write-Host "Gerando build e publicando v$Version..." -ForegroundColor Green
npm run release

if ($LASTEXITCODE -ne 0) {
  Write-Host 'Falha no build/publicacao.' -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ''
Write-Host "Release v$Version publicada com sucesso!" -ForegroundColor Green
Write-Host 'Usuarios com o app instalado receberao o aviso de atualizacao automaticamente.' -ForegroundColor Green
Write-Host "Veja: https://github.com/joaopedrosandrade/fomy-desktop/releases" -ForegroundColor Cyan
