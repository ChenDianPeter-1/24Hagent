<#
.SYNOPSIS
    Detects project toolchain and audits QUALITY_GATES.json readiness.
.DESCRIPTION
    Probes package.json for test/lint/typecheck/coverage tools, compares
    against current QUALITY_GATES.json, and generates readiness report + suggestions.
.PARAMETER ReportPath
    Default: .agent/QUALITY_READINESS_REPORT.md
.PARAMETER SuggestedPath
    Default: .agent/QUALITY_GATES_SUGGESTED.json
#>
param(
    [string]$ReportPath = ".agent/QUALITY_READINESS_REPORT.md",
    [string]$SuggestedPath = ".agent/QUALITY_GATES_SUGGESTED.json"
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-FileSafe {
    param([string]$Path, [string]$Content)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $Content | Set-Content -Path $Path -Encoding UTF8
}

function Read-JsonSafe {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    try { return (Get-Content -Path $Path -Raw -Encoding UTF8 | ConvertFrom-Json) }
    catch { return $null }
}

function Check-FileExists {
    param([string]$Path)
    return (Test-Path $Path)
}

function Test-IsPlaceholderTestScript {
    <#
    .SYNOPSIS
        Returns $true if a package.json test script is an npm default placeholder.
        Placeholders include: "Error: no test specified", "exit 1", or echo-based stubs.
    #>
    param([string]$Command)
    if ($null -eq $Command -or $Command -eq "") { return $true }
    # npm init default: echo "Error: no test specified" && exit 1
    if ($Command -match 'no test specified') { return $true }
    # Any echo + exit 1 combo without actual test runner invocation
    if (($Command -match '\bexit 1\b') -and ($Command -notmatch '\b(vitest|jest|mocha|ava|tap|tape|node|python|pytest|go test|cargo test|dotnet test|rspec)\b')) {
        return $true
    }
    # Simple echo-only stubs
    if ($Command -match '^\s*echo\s+' -and $Command -notmatch '\b(vitest|jest|mocha|ava|tap|tape)\b') {
        return $true
    }
    return $false
}

function Get-Scripts {
    param($Pkg)
    if ($null -eq $Pkg -or $null -eq $Pkg.scripts) { return @{} }
    $result = @{}
    $Pkg.scripts.PSObject.Properties | ForEach-Object { $result[$_.Name] = $_.Value }
    return $result
}

function Get-Deps {
    param($Pkg)
    $result = @{}
    $dd = $Pkg.PSObject.Properties | Where-Object { $_.Name -eq "devDependencies" }
    if ($dd) {
        $Pkg.devDependencies.PSObject.Properties | ForEach-Object { $result[$_.Name] = $_.Value }
    }
    $d = $Pkg.PSObject.Properties | Where-Object { $_.Name -eq "dependencies" }
    if ($d) {
        $Pkg.dependencies.PSObject.Properties | ForEach-Object { $result[$_.Name] = $_.Value }
    }
    return $result
}

# ---------------------------------------------------------------------------
# Probe project
# ---------------------------------------------------------------------------
$timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
$pkgJson = Read-JsonSafe "package.json"
$hasPackageJson = ($null -ne $pkgJson)
$scripts = if ($hasPackageJson) { Get-Scripts $pkgJson } else { @{} }
$deps = if ($hasPackageJson) { Get-Deps $pkgJson } else { @{} }

# Detect package manager
$packageManager = "unknown"
if (Check-FileExists "pnpm-lock.yaml") { $packageManager = "pnpm" }
elseif (Check-FileExists "yarn.lock") { $packageManager = "yarn" }
elseif (Check-FileExists "bun.lockb") { $packageManager = "bun" }
elseif (Check-FileExists "package-lock.json") { $packageManager = "npm" }
elseif ($hasPackageJson) { $packageManager = "npm (no lock file)" }

# Detect test runner
$testRunner = "unknown"
$testCommand = $null
$testConfigFile = $null
$hasVitest = ($deps.ContainsKey("vitest")) -or (Check-FileExists "vitest.config.js") -or (Check-FileExists "vitest.config.ts")
$hasJest = ($deps.ContainsKey("jest")) -or (Check-FileExists "jest.config.js") -or (Check-FileExists "jest.config.ts")
$hasMocha = ($deps.ContainsKey("mocha")) -or (Check-FileExists ".mocharc.js") -or (Check-FileExists ".mocharc.json")

if ($hasVitest) {
    $testRunner = "vitest"; $testConfigFile = "vitest.config.*"
    $testCommand = if ($scripts.ContainsKey("test:coverage")) { "npm run test:coverage" } elseif ($scripts.ContainsKey("test")) { "npm test" } else { "npx vitest run" }
}
elseif ($hasJest) {
    $testRunner = "jest"; $testConfigFile = "jest.config.*"
    $testCommand = if ($scripts.ContainsKey("test")) { "npm test" } else { "npx jest" }
}
elseif ($hasMocha) {
    $testRunner = "mocha"; $testConfigFile = ".mocharc.*"
    $testCommand = if ($scripts.ContainsKey("test")) { "npm test" } else { "npx mocha" }
}
elseif ($scripts.ContainsKey("test")) {
    # Has a test script but no known runner dep
    $rawTestScript = $scripts["test"]
    if (Test-IsPlaceholderTestScript -Command $rawTestScript) {
        # Placeholder script (e.g., npm default). Do NOT treat as a real test command.
        $testRunner = "placeholder script"
        $testCommand = $null
    } elseif ($rawTestScript -match "vitest") {
        $testRunner = "vitest (script)"
        $testCommand = if ($scripts.ContainsKey("test:coverage")) { "npm run test:coverage" } else { "npm test" }
    } elseif ($rawTestScript -match "jest") {
        $testRunner = "jest (script)"
        $testCommand = "npm test"
    } elseif ($rawTestScript -match "mocha") {
        $testRunner = "mocha (script)"
        $testCommand = "npm test"
    } else {
        $testRunner = "custom script"
        $testCommand = "npm test"
    }
}

# Detect linter
$linter = "unknown"
$lintCommand = $null
$lintConfigFile = $null
$hasEslint = ($deps.ContainsKey("eslint")) -or (Check-FileExists "eslint.config.js") -or (Check-FileExists "eslint.config.mjs") -or (Check-FileExists ".eslintrc") -or (Check-FileExists ".eslintrc.json")
$hasBiome = ($deps.ContainsKey("biome")) -or (Check-FileExists "biome.json")

if ($hasEslint) {
    $linter = "eslint"; $lintConfigFile = "eslint.*"
    $lintCommand = if ($scripts.ContainsKey("lint")) { "npm run lint" } else { "npx eslint ." }
}
elseif ($hasBiome) {
    $linter = "biome"; $lintConfigFile = "biome.json"
    $lintCommand = if ($scripts.ContainsKey("lint")) { "npm run lint" } else { "npx biome check ." }
}

# Detect typechecker
$typechecker = "unknown"
$typecheckCommand = $null
$typecheckConfigFile = $null
if (Check-FileExists "tsconfig.json") {
    $typechecker = "tsc"; $typecheckConfigFile = "tsconfig.json"
    $typecheckCommand = if ($scripts.ContainsKey("typecheck")) { "npm run typecheck" } elseif ($deps.ContainsKey("typescript")) { "npx tsc --noEmit" } else { "npx tsc --noEmit" }
}
elseif (Check-FileExists "jsconfig.json") {
    $typechecker = "jsconfig (type acquisition)"; $typecheckConfigFile = "jsconfig.json"
    $typecheckCommand = $null
}

# Detect coverage tool
$coverageTool = "unknown"
$coverageCommand = $null
if ($testRunner -eq "vitest") {
    $coverageTool = "vitest built-in"
    $coverageCommand = if ($scripts.ContainsKey("test:coverage")) { "npm run test:coverage" } else { "npx vitest run --coverage" }
}
elseif ($testRunner -eq "jest") {
    $coverageTool = "jest built-in"
    $coverageCommand = "npx jest --coverage"
}
$hasNyc = ($deps.ContainsKey("nyc")) -or (Check-FileExists "nyc.config.js") -or (Check-FileExists ".nycrc")
$hasC8 = $deps.ContainsKey("c8")
$testCommandOrDefault = if ($null -ne $testCommand) { $testCommand } else { "npm test" }

if ($hasNyc) {
    $coverageTool = "nyc"; $coverageConfigFile = "nyc.*"
    $coverageCommand = "npx nyc " + $testCommandOrDefault
}
elseif ($hasC8) {
    $coverageTool = "c8"
    $coverageCommand = "npx c8 " + $testCommandOrDefault
}

# ---------------------------------------------------------------------------
# Audit current QUALITY_GATES.json
# ---------------------------------------------------------------------------
$currentGates = Read-JsonSafe ".agent/QUALITY_GATES.json"
$gateAudit = @()
$readinessVerdict = "READY"
$blockingIssues = @()

if (-not $hasPackageJson) {
    $readinessVerdict = "NEEDS_CONFIG"
    $blockingIssues += "package.json not found. This does not appear to be a Node.js project."
}

foreach ($gateName in @("test","lint","typecheck","coverage")) {
    $currentCmd = if ($null -ne $currentGates.gates.$gateName) { $currentGates.gates.$gateName.command } else { "N/A" }
    $suggestedCmd = ""
    $matchStatus = "UNKNOWN"

    switch ($gateName) {
        "test" {
            $suggestedCmd = $testCommand
            if ($currentCmd -eq $testCommand) { $matchStatus = "MATCH" }
            elseif ($null -eq $testCommand) { $matchStatus = "MISSING_TOOL"; $readinessVerdict = "BLOCKED" }
            else { $matchStatus = "MISMATCH" }
        }
        "lint" {
            $suggestedCmd = $lintCommand
            if ($currentCmd -eq $lintCommand) { $matchStatus = "MATCH" }
            elseif ($null -eq $lintCommand) { $matchStatus = "MISSING_TOOL"; $readinessVerdict = "BLOCKED" }
            else { $matchStatus = "MISMATCH" }
        }
        "typecheck" {
            $suggestedCmd = $typecheckCommand
            if ($currentCmd -eq $typecheckCommand) { $matchStatus = "MATCH" }
            elseif ($null -eq $typecheckCommand) { $matchStatus = "MISSING_TOOL" }
            else { $matchStatus = "MISMATCH" }
        }
        "coverage" {
            $suggestedCmd = $coverageCommand
            if ($currentCmd -eq $coverageCommand) { $matchStatus = "MATCH" }
            elseif ($null -eq $coverageCommand) { $matchStatus = "MISSING_TOOL"; $readinessVerdict = "BLOCKED" }
            else { $matchStatus = "MISMATCH" }
        }
    }

    $displayCurrent = if ($null -ne $currentCmd) { $currentCmd } else { "N/A" }
    $displaySuggested = if ($null -ne $suggestedCmd) { $suggestedCmd } else { "(needs config)" }
    $gateAudit += [PSCustomObject]@{Gate=$gateName; CurrentCommand=$displayCurrent; SuggestedCommand=$displaySuggested; MatchStatus=$matchStatus }
}

if ($testRunner -eq "unknown" -or $testRunner -eq "placeholder script") {
    $blockingIssues += "No real test runner detected (placeholder or missing). Test gate cannot execute."
    $readinessVerdict = "BLOCKED"
}
elseif ($testRunner -eq "custom script") {
    $blockingIssues += "Test runner is a custom script without known framework. Test gate may not provide coverage output."
    if ($readinessVerdict -ne "BLOCKED") { $readinessVerdict = "NEEDS_CONFIG" }
}
if ($linter -eq "unknown") {
    $blockingIssues += "No linter detected. Lint gate cannot execute."
    if ($readinessVerdict -ne "BLOCKED") { $readinessVerdict = "NEEDS_CONFIG" }
}
if ($coverageTool -eq "unknown") {
    $blockingIssues += "No coverage tool detected. Coverage gate (100% threshold) cannot execute."
    $readinessVerdict = "BLOCKED"
}
if ($testRunner -eq "placeholder script") {
    $blockingIssues += "package.json test script is an npm default placeholder (contains 'no test specified' / 'exit 1'). Replace with a real test command."
}

# ---------------------------------------------------------------------------
# Generate QUALITY_GATES_SUGGESTED.json
# ---------------------------------------------------------------------------
$suggested = @{
    version = "1.0"
    tdd_required = $true
    gates = @{
        test = @{
            enabled = ($testCommand -ne $null)
            command = ($testCommand)
            blocking = $true
            description = if ($testCommand) { "All tests must pass" } else { "NEEDS CONFIG: install a test runner (vitest/jest), add test script, then set command here" }
        }
        lint = @{
            enabled = ($lintCommand -ne $null)
            command = ($lintCommand)
            blocking = $true
            description = if ($lintCommand) { "No lint errors allowed" } else { "NEEDS CONFIG: install a linter (eslint/biome), add lint script, then set command here" }
        }
        typecheck = @{
            enabled = ($typecheckCommand -ne $null)
            command = ($typecheckCommand)
            blocking = $true
            description = if ($typecheckCommand) { "No type errors allowed" } else { "NEEDS CONFIG: add tsconfig.json and typescript dependency, then set command here. Optional for JS-only projects." }
        }
        coverage = @{
            enabled = ($coverageCommand -ne $null)
            command = ($coverageCommand)
            blocking = $true
            threshold = @{lines=100;branches=100;functions=100;statements=100}
            description = if ($coverageCommand) { "100% coverage required. Below threshold = BLOCKING failure." } else { "NEEDS CONFIG: install a coverage tool (vitest/jest built-in, or nyc), then set command here. Threshold remains at 100%." }
        }
    }
    enforcement = @{
        any_gate_fail_means_validation_fail = $true
        coverage_below_threshold_is_blocking = $true
        orchestrator_must_run_gates_independently = $true
        do_not_trust_worker_self_report = $true
    }
    metadata = @{
        detected_package_manager = $packageManager
        detected_test_runner = $testRunner
        detected_linter = $linter
        detected_typechecker = $typechecker
        detected_coverage_tool = $coverageTool
        generated_at = $timestamp
        note = "Suggestion only. Does not override QUALITY_GATES.json."
    }
}

# Convert to JSON manually to control formatting
$null = $null

# Use ConvertTo-Json with proper depth
$suggestedJson = $suggested | ConvertTo-Json -Depth 5
Write-FileSafe -Path $SuggestedPath -Content $suggestedJson

# ---------------------------------------------------------------------------
# Generate QUALITY_READINESS_REPORT.md
# ---------------------------------------------------------------------------
$auditTable = ($gateAudit | ForEach-Object { "| $($_.Gate) | ``$($_.CurrentCommand)`` | ``$($_.SuggestedCommand)`` | $($_.MatchStatus) |" }) -join "`n"

$blockingList = if (@($blockingIssues).Count -eq 0) { "None." } else { ($blockingIssues | ForEach-Object { "- $_" }) -join "`n" }

$nextStepsLines = @()
if ($readinessVerdict -eq "BLOCKED") {
    $nextStepsLines += "1. Install test runner: npm install --save-dev vitest (or jest)"
    $nextStepsLines += "2. Install linter: npm install --save-dev eslint"
    $nextStepsLines += "3. Add test/lint scripts to package.json"
    $nextStepsLines += "4. Run this script again to verify toolchain"
    $nextStepsLines += "5. If JS-only (no TypeScript), set typecheck gate enabled=false in QUALITY_GATES.json"
}
elseif ($readinessVerdict -eq "NEEDS_CONFIG") {
    $nextStepsLines += "1. Update .agent/QUALITY_GATES.json to match suggested commands"
    $nextStepsLines += "2. Run validate_task.ps1 -DryRun to verify gate commands resolve"
}
else {
    $nextStepsLines += "1. Run validate_task.ps1 -DryRun to verify all gate commands resolve correctly"
    $nextStepsLines += "2. Run validate_task.ps1 to perform first local validation"
}

$report = @"
# Quality Readiness Report

Generated: $timestamp

## Project Detection

| Property | Value |
|----------|-------|
| Package Manager | $packageManager |
| Test Runner | $testRunner |
| Linter | $linter |
| Typechecker | $typechecker |
| Coverage Tool | $coverageTool |
| has package.json | $hasPackageJson |

## Available Scripts (from package.json)

$($scripts.Keys | ForEach-Object { "- ``$_``: ``$($scripts[$_])``" } | Out-String)

## QUALITY_GATES.json Command Audit

| Gate | Current Command | Suggested Command | Match |
|------|-----------------|-------------------|-------|
$auditTable

## Coverage Threshold

Threshold is 100% for lines/branches/functions/statements. This is an MVP hard requirement.
Missing coverage tool does NOT lower the threshold -- it means the project is BLOCKED until tooling is set up.

## Readiness Verdict

**$readinessVerdict**

## Blocking Issues

$blockingList

## Files Created

- Suggestion: $SuggestedPath
- This report: $ReportPath

## Next Steps

$($nextStepsLines -join "`n")

> Note: QUALITY_GATES.json has NOT been modified. This report and the suggested JSON are advisory only.
"@

Write-FileSafe -Path $ReportPath -Content $report
Write-Host ""
Write-Host "=========================================="
Write-Host " Readiness Report: $ReportPath"
Write-Host " Suggested Gates: $SuggestedPath"
Write-Host " Verdict: $readinessVerdict"
Write-Host "=========================================="
