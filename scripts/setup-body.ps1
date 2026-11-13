$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
if(-not (Test-Path -LiteralPath '.venv-body/Scripts/python.exe')){
    uv venv --python 3.10 .venv-body
    if($LASTEXITCODE -ne 0){throw 'Body environment creation failed'}
}
uv pip sync --python .venv-body/Scripts/python.exe backend/requirements.lock
if($LASTEXITCODE -ne 0){throw 'Body dependency installation failed'}
