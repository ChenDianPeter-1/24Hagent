<#
.SYNOPSIS
    24Hagent one-command setup. Copies core files, detects toolchain,
    interactively generates blueprint and quality gates.
.DESCRIPTION
    Reads core files from the 24Hagent repo and writes them to your project.
    Asks 2 questions to generate PROJECT_BLUEPRINT.md draft.
    Quality gate selection is automatic based on toolchain detection.
    Auto-detects package.json to generate QUALITY_GATES.json.
    Copies the brainstorming skill for optional blueprint refinement.
    Runs readiness check at the end.
.PARAMETER TargetProject
    Target project path. Default: current directory.
.PARAMETER SourceRoot
    24Hagent repository root. Default: directory of this script.
.PARAMETER SkipReadiness
    Skip the readiness check (for testing).
#>
param(
    [string]$TargetProject = (Get-Location).Path,
    [string]$SourceRoot = (Split-Path -Parent $MyInvocation.MyCommand.Path),
    [switch]$SkipReadiness
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$TargetProject = [System.IO.Path]::GetFullPath($TargetProject)
$SourceRoot    = [System.IO.Path]::GetFullPath($SourceRoot)

# ===========================================================================
# Helpers
# ===========================================================================
function Write-FileSafe {
    param([string]$Path, [string]$Content)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Copy-FileSafe {
    param([string]$Source, [string]$Dest)
    if (-not (Test-Path $Source)) {
        Write-Warning "Source not found, skipping: $Source"
        return
    }
    $dir = Split-Path -Parent $Dest
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    Copy-Item -Path $Source -Destination $Dest -Force
    Write-Host "  Copied: $Dest"
}

function Copy-DirSafe {
    param([string]$Source, [string]$Dest)
    if (-not (Test-Path $Source)) {
        Write-Warning "Source dir not found, skipping: $Source"
        return
    }
    if (-not (Test-Path $Dest)) {
        New-Item -ItemType Directory -Path $Dest -Force | Out-Null
    }
    # Use Get-ChildItem to preserve subdirectory structure (Copy-Item "$Source/*"
    # with -Recurse flattens the first level on PowerShell 5.1).
    Get-ChildItem -Path $Source -Force | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $Dest -Recurse -Force
    }
    Write-Host "  Copied dir: $Dest"
}

function Read-JsonSafe {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    try { return (Get-Content -Path $Path -Raw -Encoding UTF8 | ConvertFrom-Json) }
    catch { return $null }
}

function Test-IsPlaceholderTestScript {
    param([string]$Command)
    if ($null -eq $Command -or $Command -eq "") { return $true }
    if ($Command -match 'no test specified') { return $true }
    if (($Command -match '\bexit 1\b') -and ($Command -notmatch '\b(vitest|jest|mocha|ava|tap|tape|node|python|pytest|go test|cargo test|dotnet test|rspec)\b')) {
        return $true
    }
    return $false
}

# ===========================================================================
# Step 1: Copy core files
# ===========================================================================
Write-Host ""
Write-Host "=========================================="
Write-Host " 24Hagent Setup"
Write-Host "=========================================="
Write-Host ""
Write-Host "Target project: $TargetProject"
Write-Host ""

if (-not (Test-Path $TargetProject)) {
    New-Item -ItemType Directory -Path $TargetProject -Force | Out-Null
}

# Core scripts
Write-Host "--- Copying scripts ---"
Copy-FileSafe -Source "$SourceRoot/scripts/check_quality_readiness.ps1" `
              -Dest   "$TargetProject/scripts/check_quality_readiness.ps1"
Copy-FileSafe -Source "$SourceRoot/scripts/validate_task.ps1" `
              -Dest   "$TargetProject/scripts/validate_task.ps1"
Copy-FileSafe -Source "$SourceRoot/scripts/codex_review.ps1" `
              -Dest   "$TargetProject/scripts/codex_review.ps1"

# Protocol + startup
Write-Host "--- Copying protocol files ---"
Copy-FileSafe -Source "$SourceRoot/CLAUDE_ORCHESTRATOR_PROTOCOL.md" `
              -Dest   "$TargetProject/CLAUDE_ORCHESTRATOR_PROTOCOL.md"
Copy-FileSafe -Source "$SourceRoot/START_ORCHESTRATOR.md" `
              -Dest   "$TargetProject/START_ORCHESTRATOR.md"

# Review rubric
Write-Host "--- Copying review rubric ---"
Copy-FileSafe -Source "$SourceRoot/.agent/CODEX_REVIEW_RUBRIC.md" `
              -Dest   "$TargetProject/.agent/CODEX_REVIEW_RUBRIC.md"

# Brainstorming skill (full directory)
Write-Host "--- Copying brainstorming skill ---"
Copy-DirSafe -Source "$SourceRoot/.claude/skills/brainstorming" `
             -Dest   "$TargetProject/.claude/skills/brainstorming"

# ===========================================================================
# Step 2: Toolchain detection
# ===========================================================================
Write-Host ""
Write-Host "--- Detecting toolchain ---"

$pkgJson = Read-JsonSafe "$TargetProject/package.json"
$hasPackageJson = ($null -ne $pkgJson)

$scripts = @{}
if ($hasPackageJson -and $null -ne $pkgJson.scripts) {
    $pkgJson.scripts.PSObject.Properties | ForEach-Object { $scripts[$_.Name] = $_.Value }
}

$deps = @{}
if ($hasPackageJson) {
    foreach ($ds in @("devDependencies", "dependencies")) {
        $prop = $pkgJson.PSObject.Properties | Where-Object { $_.Name -eq $ds }
        if ($prop) {
            $pkgJson.$ds.PSObject.Properties | ForEach-Object { $deps[$_.Name] = $_.Value }
        }
    }
}

# Test runner
$testCommand = $null
$testRunner  = "unknown"
if ($deps.ContainsKey("vitest")) {
    $testRunner = "vitest"
    $testCommand = if ($scripts.ContainsKey("test")) { "npm test" } else { "npx vitest run" }
} elseif ($deps.ContainsKey("jest")) {
    $testRunner = "jest"
    $testCommand = if ($scripts.ContainsKey("test")) { "npm test" } else { "npx jest" }
} elseif ($deps.ContainsKey("mocha")) {
    $testRunner = "mocha"
    $testCommand = if ($scripts.ContainsKey("test")) { "npm test" } else { "npx mocha" }
} elseif ($scripts.ContainsKey("test")) {
    $rawScript = $scripts["test"]
    if (-not (Test-IsPlaceholderTestScript -Command $rawScript)) {
        $testRunner = "custom script"
        $testCommand = "npm test"
    }
}

# Linter
$lintCommand = $null
$linter = "unknown"
if ($deps.ContainsKey("eslint")) {
    $linter = "eslint"
    $lintCommand = if ($scripts.ContainsKey("lint")) { "npm run lint" } else { "npx eslint src/" }
} elseif ($deps.ContainsKey("biome")) {
    $linter = "biome"
    $lintCommand = if ($scripts.ContainsKey("lint")) { "npm run lint" } else { "npx biome check ." }
}

# Typechecker
$typecheckCommand = $null
$typechecker = "unknown"
if (Test-Path "$TargetProject/tsconfig.json") {
    $typechecker = "tsc"
    $typecheckCommand = if ($scripts.ContainsKey("typecheck")) { "npm run typecheck" } else { "npx tsc --noEmit" }
}

# Coverage
$coverageCommand = $null
$coverageTool = "unknown"
if ($testRunner -eq "vitest") {
    $coverageTool = "vitest built-in"
    $coverageCommand = if ($scripts.ContainsKey("coverage")) { "npm run coverage" } else { "npx vitest run --coverage" }
} elseif ($testRunner -eq "jest") {
    $coverageTool = "jest built-in"
    $coverageCommand = if ($scripts.ContainsKey("coverage")) { "npm run coverage" } else { "npx jest --coverage" }
}

Write-Host "  Test:        $testRunner ($testCommand)"
Write-Host "  Lint:        $linter ($lintCommand)"
Write-Host "  Typecheck:   $typechecker ($typecheckCommand)"
Write-Host "  Coverage:    $coverageTool ($coverageCommand)"

# ===========================================================================
# Step 3: Questions
# ===========================================================================
Write-Host ""
Write-Host "--- 2 questions to generate your project blueprint ---"
Write-Host ""

$projectGoal = Read-Host "What does your project do (one sentence)"
if ([string]::IsNullOrWhiteSpace($projectGoal)) {
    $projectGoal = "(edit .agent/PROJECT_BLUEPRINT.md with your actual project goal)"
}

Write-Host ""
Write-Host "List the MVP features (comma-separated, e.g.: date formatting, diff calculation, leap year)"
$featuresRaw = Read-Host "> "
$features = @($featuresRaw -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" })
if ($features.Count -eq 0) { $features = @("(fill in your features)") }

# Quality gate decisions are automatic: enabled if toolchain detected, disabled if not.
# No user prompt. Coverage threshold is always 100%.
$enableTest      = ($null -ne $testCommand)
$enableLint      = ($null -ne $lintCommand)
$enableTypecheck = ($null -ne $typecheckCommand)
$enableCoverage  = ($null -ne $coverageCommand)
$coverageThreshold = 100

# ===========================================================================
# Step 4: Generate QUALITY_GATES.json
# ===========================================================================
Write-Host ""
Write-Host "--- Quality gates (auto-detected) ---"
Write-Host "  test:      $(if ($enableTest) { 'ENABLED' } else { 'DISABLED (no test runner detected)' })"
Write-Host "  lint:      $(if ($enableLint) { 'ENABLED' } else { 'DISABLED (no linter detected)' })"
Write-Host "  typecheck: $(if ($enableTypecheck) { 'ENABLED' } else { 'DISABLED (no tsconfig.json)' })"
Write-Host "  coverage:  $(if ($enableCoverage) { 'ENABLED' } else { 'DISABLED (no coverage tool detected)' })"
Write-Host ""

$gatesJson = @{
    tdd_required = $true
    gates = @{
        test = @{
            enabled     = $enableTest
            blocking    = $true
            command     = if ($testCommand) { $testCommand } else { "" }
            description = if ($testCommand) { "All tests must pass" } else { "NEEDS CONFIG: install a test runner (vitest/jest)" }
        }
        lint = @{
            enabled     = $enableLint -and ($null -ne $lintCommand)
            blocking    = $true
            command     = if ($lintCommand) { $lintCommand } else { "" }
            description = if ($lintCommand) { "No lint errors allowed" } else { "NEEDS CONFIG: install a linter (eslint/biome)" }
        }
        typecheck = @{
            enabled     = $enableTypecheck -and ($null -ne $typecheckCommand)
            blocking    = $true
            command     = if ($typecheckCommand) { $typecheckCommand } else { "" }
            description = if ($typecheckCommand) { "No type errors allowed" } else { "NEEDS CONFIG: add tsconfig.json + typescript" }
        }
        coverage = @{
            enabled     = $enableCoverage -and ($null -ne $coverageCommand)
            blocking    = $true
            command     = if ($coverageCommand) { $coverageCommand } else { "" }
            threshold   = @{
                lines      = $coverageThreshold
                branches   = $coverageThreshold
                functions  = $coverageThreshold
                statements = $coverageThreshold
            }
            description = if ($coverageCommand) { "$coverageThreshold% coverage required" } else { "NEEDS CONFIG: install a coverage tool" }
        }
    }
}

$gatesJsonText = ($gatesJson | ConvertTo-Json -Depth 4)
Write-FileSafe -Path "$TargetProject/.agent/QUALITY_GATES.json" -Content $gatesJsonText
Write-Host "  QUALITY_GATES.json generated"

# ===========================================================================
# Step 5: Generate PROJECT_BLUEPRINT.md
# ===========================================================================
Write-Host "--- Generating project blueprint ---"

$featuresMd = ($features | ForEach-Object { "- $_" }) -join "`n"

$techBoundaries = @()
if ($deps.Count -gt 0) {
    $techBoundaries += "- Detected dependencies: $($deps.Keys -join ', ')"
}
if ($testRunner -ne "unknown") { $techBoundaries += "- Test runner: $testRunner" }
if ($typechecker -eq "tsc")   { $techBoundaries += "- TypeScript strict mode" }
if ($linter -ne "unknown")    { $techBoundaries += "- Linter: $linter" }
$techBoundariesText = if ($techBoundaries.Count -gt 0) {
    ($techBoundaries -join "`n")
} else {
    "- (fill in your technical boundaries)"
}

$blueprint = @"
# Project Blueprint

## Project Goal

$projectGoal

## MVP Scope

### In Scope

$featuresMd

### Out of Scope

<!-- What is explicitly NOT in scope -->

## User Requirements

<!-- What users need: -->

## Technical Boundaries

$techBoundariesText

## Phase Goals

| Phase | Goal | Deliverable |
|-------|------|-------------|
| 1 | Core features | All MVP functions working |
| 2 | Edge cases | Comprehensive tests and docs |

## Acceptance Criteria

<!-- What "done" means: -->
- All tests pass
- 100% coverage (lines/branches/functions/statements)
- No type errors
- No lint errors

## Prohibited Actions

- Do not auto-push to remote
- Do not auto-merge branches
- Do not delete files without human approval
- Do not modify secrets, credentials, or tokens
- Do not install/remove dependencies without human approval
- Do not modify files outside the approved scope
"@

Write-FileSafe -Path "$TargetProject/.agent/PROJECT_BLUEPRINT.md" -Content $blueprint
Write-Host "  PROJECT_BLUEPRINT.md generated"

# ===========================================================================
# Step 6: Readiness check
# ===========================================================================
Write-Host ""
Write-Host "--- Readiness check ---"

$readinessScript = "$TargetProject/scripts/check_quality_readiness.ps1"
$readinessPassed = $false

if ($SkipReadiness) {
    Write-Host "  (skipped)"
    $readinessPassed = $true
} elseif (Test-Path $readinessScript) {
    $prevLocation = Get-Location
    try {
        Set-Location $TargetProject
        $result = & powershell -NoProfile -ExecutionPolicy Bypass -File $readinessScript 2>&1
        Write-Host ($result | Out-String)

        $resultStr = ($result | Out-String)
        if ($resultStr -match '\*\*READY\*\*' -and $resultStr -notmatch '\*\*BLOCKED\*\*') {
            $readinessPassed = $true
        } elseif ($resultStr -match '\*\*NEEDS_CONFIG\*\*') {
            Write-Host ""
            Write-Host "  Toolchain is ready but QUALITY_GATES.json commands may need tuning."
            Write-Host "  Compare .agent/QUALITY_GATES_SUGGESTED.json with .agent/QUALITY_GATES.json."
            $readinessPassed = $true
        }
    } finally {
        Set-Location $prevLocation
    }
} else {
    Write-Warning "Readiness check script not found. Ensure scripts/ was copied correctly."
}

# ===========================================================================
# Step 7: Summary
# ===========================================================================
Write-Host ""
Write-Host "=========================================="
Write-Host " Setup Complete"
Write-Host "=========================================="
Write-Host ""
Write-Host "Files created:"
Write-Host "  scripts/check_quality_readiness.ps1"
Write-Host "  scripts/validate_task.ps1"
Write-Host "  scripts/codex_review.ps1"
Write-Host "  CLAUDE_ORCHESTRATOR_PROTOCOL.md"
Write-Host "  START_ORCHESTRATOR.md"
Write-Host "  .agent/QUALITY_GATES.json          (auto-filled from your toolchain)"
Write-Host "  .agent/CODEX_REVIEW_RUBRIC.md"
Write-Host "  .agent/PROJECT_BLUEPRINT.md        (draft from your answers)"
Write-Host "  .claude/skills/brainstorming/      (use to refine your blueprint)"
Write-Host ""

if (-not $readinessPassed) {
    Write-Host "Readiness check did not pass. Fix the toolchain, then re-run:"
    Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check_quality_readiness.ps1"
    Write-Host ""
    Write-Host "Once you see READY, paste the startup prompt from START_ORCHESTRATOR.md into Claude Code."
} else {
    Write-Host "Next steps:"
    Write-Host ""
    Write-Host "  1. (Recommended) Refine your blueprint with the brainstorming skill:"
    Write-Host '     In Claude Code, say: use brainstorming to improve .agent/PROJECT_BLUEPRINT.md'
    Write-Host ""
    Write-Host "  2. Review .agent/PROJECT_BLUEPRINT.md to confirm goals, scope, and constraints."
    Write-Host ""
    Write-Host "  3. Paste the startup prompt from START_ORCHESTRATOR.md into Claude Code."
    Write-Host ""
    Write-Host "  4. Human only intervenes when HUMAN_HANDOFF.md appears."
}

Write-Host ""
