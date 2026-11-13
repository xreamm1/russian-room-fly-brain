$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
New-Item -ItemType Directory -Force -Path '.cache' | Out-Null
$pythonExe=Join-Path $repoRoot '.venv-body\Scripts\python.exe'
if(-not (Test-Path -LiteralPath $pythonExe)){throw 'Native body environment is missing. Run scripts/setup-body.ps1 first.'}
if(-not (Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue)){
    Start-Process -FilePath $pythonExe -ArgumentList @('-m','uvicorn','backend.server:app','--host','127.0.0.1','--port','8765') -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput '.cache/body.stdout.log' -RedirectStandardError '.cache/body.stderr.log' | Out-Null
}
if(-not (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)){
    Start-Process -FilePath (Get-Command node).Source -ArgumentList @('node_modules/vite/bin/vite.js') -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput '.cache/vite.stdout.log' -RedirectStandardError '.cache/vite.stderr.log' | Out-Null
}
Write-Output 'Local app: http://127.0.0.1:5173/russian-room-fly-brain/'
