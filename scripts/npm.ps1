param([Parameter(ValueFromRemainingArguments=$true)][string[]]$NpmArgs)
$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $ProjectRoot
$LocalNode = Join-Path $ProjectRoot '.tools\node_modules\node\bin\node.exe'
$NpmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
$NpmCli = Join-Path (Split-Path $NpmCommand -Parent) 'node_modules\npm\bin\npm-cli.js'
if (Test-Path -LiteralPath $LocalNode) {
  $env:PATH = (Split-Path $LocalNode -Parent) + ';' + $env:PATH
  & $LocalNode $NpmCli @NpmArgs
} else { & $NpmCommand @NpmArgs }
exit $LASTEXITCODE
