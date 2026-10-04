param([string]$Url='http://localhost:3000',[ValidateSet('Edge','Chrome')][string]$Browser='Edge')
$ErrorActionPreference='Stop'
$TargetUrl=[Uri]$Url
if ($TargetUrl.Scheme -notin @('http','https') -or $TargetUrl.UserInfo) { throw 'Use an HTTP or HTTPS URL without credentials.' }
$ProjectRoot=Split-Path $PSScriptRoot -Parent
$Candidates=if($Browser -eq 'Edge') { @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe","$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") } else { @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe","${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe","$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") }
$BrowserPath=$Candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (!$BrowserPath) { throw "$Browser executable not found." }
$Wsh=New-Object -ComObject WScript.Shell
$Folders=@([Environment]::GetFolderPath('Desktop'),(Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'))
foreach($Folder in $Folders) {
  $ShortcutPath=Join-Path $Folder 'New_wAnime.lnk'
  if (Test-Path -LiteralPath $ShortcutPath) { throw "Existing shortcut was preserved: $ShortcutPath" }
}
foreach($Folder in $Folders) {
  $Shortcut=$Wsh.CreateShortcut((Join-Path $Folder 'New_wAnime.lnk'))
  $Shortcut.TargetPath=$BrowserPath
  $Shortcut.Arguments='--app="'+$TargetUrl.AbsoluteUri+'"'
  $Shortcut.WorkingDirectory=$ProjectRoot
  $Shortcut.IconLocation=(Join-Path $ProjectRoot 'public\app.ico')+',0'
  $Shortcut.Description='New_wAnime - Anime and drama discovery'
  $Shortcut.Save()
}
Write-Output 'New_wAnime shortcuts created on Desktop and Start Menu.'
