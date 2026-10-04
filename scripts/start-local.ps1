$ErrorActionPreference='Stop'
$ProjectRoot=Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $ProjectRoot
& (Join-Path $PSScriptRoot 'npm.ps1') run setup
# Start the local DB as a hidden child and stop only this instance on exit.
$LocalNode=Join-Path $ProjectRoot '.tools\node_modules\node\bin\node.exe'
$NodePath=if(Test-Path -LiteralPath $LocalNode){$LocalNode}else{(Get-Command node).Source}
$env:PATH=(Split-Path $NodePath -Parent)+';'+$env:PATH
$DbProcess=Start-Process -FilePath $NodePath -ArgumentList @('--import','tsx','scripts/local-db.ts') -WorkingDirectory $ProjectRoot -WindowStyle Hidden -PassThru
try {
  $DbReady=$false
  for($Attempt=0;$Attempt -lt 30;$Attempt++) {
    Start-Sleep -Seconds 1
    $Socket=New-Object System.Net.Sockets.TcpClient
    try {$Socket.Connect('127.0.0.1',55432);$DbReady=$true;break}catch{}finally{$Socket.Dispose()}
  }
  if(!$DbReady){throw 'PostgreSQL did not start. Check port 55432 and data/postgres.'}
  & (Join-Path $PSScriptRoot 'npm.ps1') run db:migrate
  if($LASTEXITCODE -ne 0){throw 'Database migration failed.'}
  & (Join-Path $PSScriptRoot 'npm.ps1') run dev
} finally {
  if(!$DbProcess.HasExited){
    $StopFile=Join-Path $ProjectRoot ('data\stop-local-db.'+$DbProcess.Id)
    [System.IO.File]::WriteAllText($StopFile,'STOP')
    if(!$DbProcess.WaitForExit(15000)){Write-Warning 'Database shutdown has not finished. Check the db:local process.'}
  }
}
