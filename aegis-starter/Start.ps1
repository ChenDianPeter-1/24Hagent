param(
    [switch]$SkipReadiness,
    [switch]$NoClaude
)

$ErrorActionPreference = "Stop"

$starterDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $starterDir
$setup = Join-Path $starterDir "setup.ps1"

if (-not (Test-Path $setup)) {
    Write-Host "[ERROR] setup.ps1 was not found next to Start.ps1." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Aegis setup..." -ForegroundColor Cyan
Write-Host "Project root: $projectRoot"

$setupArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $setup, "-ProjectRoot", $projectRoot)
if ($SkipReadiness) {
    $setupArgs += "-SkipReadiness"
}
if ($NoClaude) {
    $setupArgs += "-NoClaude"
}

& powershell @setupArgs
