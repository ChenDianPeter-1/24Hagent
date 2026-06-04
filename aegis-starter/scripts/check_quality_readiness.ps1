param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)

$ErrorActionPreference = "Stop"

$starterDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$bin = Join-Path $starterDir "bin/aegis.mjs"

if (-not (Test-Path $bin)) {
    Write-Host "[ERROR] Aegis CLI was not found: $bin" -ForegroundColor Red
    exit 1
}

& node $bin readiness @Args
exit $LASTEXITCODE
