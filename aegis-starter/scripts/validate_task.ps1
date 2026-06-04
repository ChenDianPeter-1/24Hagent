param(
    [switch]$DryRun,
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

if ($DryRun) {
    & node $bin validate:plan @Args
} else {
    & node $bin validate @Args
}
exit $LASTEXITCODE
