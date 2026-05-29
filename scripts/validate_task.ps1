<#
.SYNOPSIS
    Validates the current task against quality gates defined in QUALITY_GATES.json.
.DESCRIPTION
    Reads .agent/QUALITY_GATES.json, executes each enabled gate command independently,
    captures exit codes and output, checks coverage thresholds, and generates
    .agent/VALIDATION_REPORT.md with the results.

    The Orchestrator runs this script after the Worker completes. It does NOT trust
    the Worker's self-report - it runs all gates independently.
.PARAMETER ConfigPath
    Default: .agent/QUALITY_GATES.json
.PARAMETER ReportPath
    Default: .agent/VALIDATION_REPORT.md
.PARAMETER ReadinessPath
    Default: .agent/QUALITY_READINESS_REPORT.md
.PARAMETER E2EReportPath
    Default: .agent/QUALITY_GATE_E2E_REPORT.md
.PARAMETER DryRun
    Print the commands that would be executed without running them.
.PARAMETER ReadinessCheck
    Read readiness report and output summary only (no gate execution).
.PARAMETER GenerateE2EReport
    Generate end-to-end quality gate report.
#>
param(
    [string]$ConfigPath = ".agent/QUALITY_GATES.json",
    [string]$ReportPath = ".agent/VALIDATION_REPORT.md",
    [string]$ReadinessPath = ".agent/QUALITY_READINESS_REPORT.md",
    [string]$E2EReportPath = ".agent/QUALITY_GATE_E2E_REPORT.md",
    [switch]$DryRun,
    [switch]$ReadinessCheck,
    [switch]$GenerateE2EReport
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Read-JsonFile {
    param([string]$Path)
    $raw = Get-Content -Path $Path -Raw -Encoding UTF8
    return ($raw | ConvertFrom-Json)
}
function Read-SectionValue {
    param([string]$Path, [string]$SectionName)
    if (-not (Test-Path $Path)) { return "N/A" }
    $lines = Get-Content -Path $Path -Encoding UTF8
    $pattern = "^\s*##\s+$([regex]::Escape($SectionName))"
    $foundHeader = $false
    foreach ($line in $lines) {
        if ($line -match $pattern) { $foundHeader = $true; continue }
        if ($foundHeader) {
            $trimmed = $line.Trim()
            if ($trimmed -eq "" -or $trimmed.StartsWith("<!--")) { continue }
            if ($trimmed -match '^\s*##') { return "N/A" }
            return $trimmed
        }
    }
    return "N/A"
}
function Read-TaskId {
    return (Read-SectionValue -Path ".agent/CURRENT_TASK.md" -SectionName "Task ID")
}
function Read-FileScope {
    $taskFile = ".agent/CURRENT_TASK.md"
    if (-not (Test-Path $taskFile)) { return @() }
    $lines = Get-Content -Path $taskFile -Encoding UTF8
    $foundHeader = $false; $scope = @()
    foreach ($line in $lines) {
        if ($line -match '^\s*##\s+File\s+Scope') { $foundHeader = $true; continue }
        if ($foundHeader) {
            $trimmed = $line.Trim()
            if ($trimmed -eq "" -or $trimmed.StartsWith("<!--")) { continue }
            if ($trimmed -match '^\s*##') { break }
            $cleaned = $trimmed -replace '^\s*-\s*', ''
            if ($cleaned -ne "" -and $cleaned -ne "-") { $scope += $cleaned }
        }
    }
    return $scope
}
function Write-FileSafe {
    param([string]$Path, [string]$Content)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $Content | Set-Content -Path $Path -Encoding UTF8
}
function Invoke-GateCommand {
    param([string]$Command)
    $stdout = ""; $stderr = ""; $exitCode = 0
    try {
        $output = & cmd.exe /c "$Command 2>&1" 2>&1
        $exitCode = $LASTEXITCODE
        $stdout = ($output | Out-String).Trim()
        $stderr = ""
    }
    catch { $exitCode = 1; $stderr = $_.Exception.Message; $stdout = "" }
    return @{ExitCode=$exitCode;Stdout=$stdout;Stderr=$stderr}
}
function Truncate-Text {
    param([string]$Text, [int]$MaxLen = 500)
    if ($Text.Length -le $MaxLen) { return $Text }
    return $Text.Substring(0, $MaxLen) + "... (truncated)"
}
function Read-ReadinessReport {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return [PSCustomObject]@{Verdict="UNKNOWN";BlockingIssues=@();HaveReport=$false} }
    $content = Get-Content -Path $Path -Raw -Encoding UTF8
    $verdict = "UNKNOWN"
    if ($content -match '\*\*(BLOCKED|READY|NEEDS_CONFIG)\*\*') { $verdict = $Matches[1] }
    $issues = @()
    $inBlocking = $false
    foreach ($line in ($content -split "`n")) {
        if ($line -match '## Blocking Issues') { $inBlocking = $true; continue }
        if ($inBlocking -and $line -match '^\s*-\s+(.+)') { $issues += $Matches[1].Trim() }
        if ($inBlocking -and $line -match '^## ') { break }
    }
    return [PSCustomObject]@{Verdict=$verdict;BlockingIssues=$issues;HaveReport=$true}
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
$ConfigPath = [System.IO.Path]::GetFullPath($ConfigPath)
$ReportPath = [System.IO.Path]::GetFullPath($ReportPath)
$timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")

if (-not (Test-Path $ConfigPath)) {
    Write-Error "Config file not found: $ConfigPath"
    exit 1
}
$config = Read-JsonFile -Path $ConfigPath
$taskId = Read-TaskId
$tddRequired = $config.tdd_required

# Readiness
$readiness = Read-ReadinessReport -Path $ReadinessPath
$readinessBlocked = ($readiness.HaveReport -and $readiness.Verdict -eq "BLOCKED")
$readinessNote = if ($readiness.HaveReport) {
    "Readiness verdict: $($readiness.Verdict). " + $(if ($readinessBlocked) { "BLOCKED - quality gates cannot execute until tooling is configured." } else { "Project tooling is configured." })
} else {
    "No readiness report found. Run scripts/check_quality_readiness.ps1 to generate one."
}

# ReadinessCheck mode
if ($ReadinessCheck) {
    Write-Host "=========================================="
    Write-Host " Readiness Check"
    Write-Host "=========================================="
    Write-Host $readinessNote
    if ($readiness.HaveReport) {
        Write-Host "Blocking issues:"
        foreach ($bi in $readiness.BlockingIssues) { Write-Host "  - $bi" }
    }
    exit $(if ($readinessBlocked) { 1 } else { 0 })
}

# DryRun command list for E2E report
$dryRunCommandList = @()
$gateOrder = @("test", "lint", "typecheck", "coverage")
$allGateCommands = @()
foreach ($gateName in $gateOrder) {
    $gate = $config.gates.$gateName
    if ($null -eq $gate) { continue }
    $cmd = if ($null -ne $gate.command -and $gate.command.ToString() -ne "") { $gate.command } else { "(no command configured)" }
    $en = if ($gate.enabled) { "enabled" } else { "disabled" }
    $dryRunCommandList += "  $gateName ($en): $cmd"
    $allGateCommands += [PSCustomObject]@{Name=$gateName;Command=$cmd;Enabled=$gate.enabled}
}

# Collect gate results
$gateResults = @()
$overallPass = $true
$blockingFailures = @()

foreach ($gateName in $gateOrder) {
    $gate = $config.gates.$gateName
    if ($null -eq $gate) { continue }

    $isEnabled = $gate.enabled
    $isBlocking = $gate.blocking
    $command = if ($null -ne $gate.command -and $gate.command.ToString().Trim() -ne "") { $gate.command } else { $null }

    # Gate disabled
    if (-not $isEnabled) {
        $displayCmd = if ($null -ne $command) { $command } else { "N/A" }
        $gateResults += [PSCustomObject]@{Name=$gateName;Command=$displayCmd;ExitCode="N/A";Status="SKIPPED";Blocking=$isBlocking;Detail="Gate disabled in config";RawOutput="";Description=$gate.description}
        continue
    }

    # Gate enabled but no command configured
    if ($null -eq $command -or $command -eq "") {
        $status = if ($DryRun) { "DRY_RUN" } else { "UNAVAILABLE" }
        $detail = if ($DryRun) { "Would execute: (no command configured)" } else { "Gate enabled but command is null or empty - needs configuration" }
        if (-not $DryRun -and $isBlocking) {
            $overallPass = $false
            $blockingFailures += "$gateName (UNAVAILABLE: command not configured)"
        }
        $gateResults += [PSCustomObject]@{Name=$gateName;Command="(none)";ExitCode=if ($DryRun) {"DRY_RUN"} else {"N/A"};Status=$status;Blocking=$isBlocking;Detail=$detail;RawOutput="";Description=$gate.description}
        if ($DryRun) { Write-Host "[DRY_RUN] $gateName (enabled, no command configured)" }
        continue
    }

    # DryRun
    if ($DryRun) {
        $gateResults += [PSCustomObject]@{Name=$gateName;Command=$command;ExitCode="DRY_RUN";Status="DRY_RUN";Blocking=$isBlocking;Detail="Would execute: $command";RawOutput="";Description=$gate.description}
        Write-Host "[DRY_RUN] Would execute: $command (blocking=$isBlocking)"
        continue
    }

    # Execute
    Write-Host "Running gate '$gateName': $command"
    $result = Invoke-GateCommand -Command $command
    $status = if ($result.ExitCode -eq 0) { "PASS" } else { "FAIL" }
    $rawOutput = Truncate-Text -Text "$($result.Stdout)`n$($result.Stderr)"
    $detail = if ($status -eq "FAIL") { $rawOutput } else { "Exit code 0" }

    if ($status -eq "FAIL" -and $isBlocking) {
        $overallPass = $false
        $blockingFailures += "$gateName (exit code $($result.ExitCode))"
    }

    $gateResults += [PSCustomObject]@{Name=$gateName;Command=$command;ExitCode=$result.ExitCode;Status=$status;Blocking=$isBlocking;Detail=$detail;RawOutput=$rawOutput;Description=$gate.description}
    Write-Host "  -> $status (exit code $($result.ExitCode))"
}

# ---------------------------------------------------------------------------
# Coverage threshold check
# ---------------------------------------------------------------------------
$coverageDetail = @()
$coverageThreshold = $null
if ($null -ne $config.gates.coverage.threshold) { $coverageThreshold = $config.gates.coverage.threshold }

if ($DryRun -and $null -ne $coverageThreshold) {
    foreach ($m in @("lines","branches","functions","statements")) {
        $req = $coverageThreshold.$m
        $coverageDetail += [PSCustomObject]@{Metric=(Get-Culture).TextInfo.ToTitleCase($m);Actual="DRY_RUN";Required="$req%";Status="DRY_RUN"}
    }
}
elseif (-not $DryRun -and $null -ne $coverageThreshold) {
    $coverageGate = $gateResults | Where-Object { $_.Name -eq "coverage" }
    $coverageOutput = if ($coverageGate) { $coverageGate.RawOutput } else { "" }
    $coverageGateEnabled = ($null -ne $config.gates.coverage) -and ($config.gates.coverage.enabled)
    $coverageGateBlocking = ($null -ne $config.gates.coverage) -and ($config.gates.coverage.blocking)

    foreach ($m in @("lines","branches","functions","statements")) {
        $req = $coverageThreshold.$m; $actual = "N/A"; $metricStatus = "UNKNOWN"
        $pattern = "(?i)$m[^0-9]*(\d+(?:\.\d+)?)\s*%"
        if ($coverageOutput -match $pattern) {
            $actual = "$($Matches[1])%"; $actualVal = [double]$Matches[1]
            if ($actualVal -ge [double]$req) { $metricStatus = "PASS" }
            else { $metricStatus = "FAIL"; $overallPass = $false; $blockingFailures += "coverage.$m ($actual < $req%)" }
        }
        else {
            $metricStatus = "PARSE_FAILED"
            if ($coverageGateEnabled -and $coverageGateBlocking) {
                $overallPass = $false
                $blockingFailures += "coverage.$m (PARSE_FAILED: could not extract coverage from output)"
            }
        }
        $coverageDetail += [PSCustomObject]@{Metric=(Get-Culture).TextInfo.ToTitleCase($m);Actual=$actual;Required="$req%";Status=$metricStatus}
    }
}

# ---------------------------------------------------------------------------
# File scope check
# ---------------------------------------------------------------------------
$scopeCheckPassed = $true
$scopeCheckFiles = @()
$scopeViolations = @()
$scopeCheckStatus = "N/A"

if (-not $DryRun) {
    $fileScope = @(Read-FileScope)
    $changedFiles = @()
    $isGitRepo = $false
    try {
        $gitCheck = & git rev-parse --is-inside-work-tree 2>&1
        if ($LASTEXITCODE -eq 0) { $isGitRepo = $true }
    } catch {}

    if (-not $isGitRepo) {
        $scopeCheckStatus = "UNAVAILABLE"
        $scopeCheckFiles = @("(not a git repository)")
    }
    elseif (@($fileScope).Count -gt 0) {
        try {
            $gitOutput = & git diff --name-only HEAD 2>&1
            if ($LASTEXITCODE -eq 0) {
                $changedFiles = @(($gitOutput | Out-String).Trim() -split "`n" | Where-Object { $_ -ne "" })
            }
        } catch {}

        if (@($changedFiles).Count -gt 0) {
            $scopeCheckFiles = $changedFiles
            foreach ($f in $changedFiles) {
                $inScope = $false
                foreach ($s in $fileScope) {
                    $sNorm = $s.TrimEnd('/')
                    if ($f -eq $sNorm -or $f.StartsWith("$sNorm/") -or $f.StartsWith("$sNorm\")) { $inScope = $true; break }
                }
                if (-not $inScope) { $scopeViolations += $f; $scopeCheckPassed = $false }
            }
            if (-not $scopeCheckPassed) {
                $scopeCheckStatus = "FAIL"
                $overallPass = $false
                $blockingFailures += "file_scope_violation ($($scopeViolations.Count) file(s) out of scope)"
            }
            else { $scopeCheckStatus = "PASS" }
        }
        else { $scopeCheckFiles = @("(no changes detected)"); $scopeCheckStatus = "PASS" }
    }
    else { $scopeCheckFiles = @("(no file scope defined in CURRENT_TASK.md)"); $scopeCheckStatus = "PASS (no scope to check)" }
}
else {
    $scopeCheckFiles = @("(DryRun: git diff not executed)")
    $scopeCheckStatus = "DRY_RUN"
}

$scopeCheckDisplay = switch ($scopeCheckStatus) {
    "PASS" { "YES"; break }
    "FAIL" { "NO"; break }
    "DRY_RUN" { "N/A (dry run)"; break }
    "UNAVAILABLE" { "N/A (not a git repo)"; break }
    default { "N/A" }
}

# ---------------------------------------------------------------------------
# Readiness impact on verdict
# ---------------------------------------------------------------------------
if ($readinessBlocked) {
    $overallPass = $false
    $blockingFailures += "project_readiness_BLOCKED (quality gates cannot execute: tooling not configured)"
}

# ---------------------------------------------------------------------------
# Build report
# ---------------------------------------------------------------------------
$overallVerdict = if ($overallPass) { "PASS" } else { "FAIL" }
$tddLine = if ($tddRequired) { "YES - TDD is required. Worker must write failing tests before implementation." } else { "NO" }

# Gate results table
$gateTableLines = @()
foreach ($gr in $gateResults) {
    $detailClean = $gr.Detail -replace "`n", " " -replace "`r", ""
    if ($detailClean.Length -gt 80) { $detailClean = $detailClean.Substring(0, 80) + "..." }
    $gateTableLines += "| $($gr.Name) | ``$($gr.Command)`` | $($gr.ExitCode) | $($gr.Status) | $detailClean |"
}
$gateTable = $gateTableLines -join "`n"

# Coverage table
$coverageTableLines = @()
foreach ($cd in $coverageDetail) {
    $coverageTableLines += "| $($cd.Metric) | $($cd.Actual) | $($cd.Required) | $($cd.Status) |"
}
$coverageTable = $coverageTableLines -join "`n"

# File scope section
$scopeFilesStr = if (@($scopeCheckFiles).Count -eq 0) { "(no changes detected or scope not defined)" } else { $scopeCheckFiles -join ", " }
$scopeViolationsStr = if (@($scopeViolations).Count -eq 0) { "None." } else { ($scopeViolations | ForEach-Object { "- $_" }) -join "`n" }

# Blocking failures
$blockingList = if (@($blockingFailures).Count -eq 0) { "None." } else { ($blockingFailures | ForEach-Object { "- $_" }) -join "`n" }

# Readiness blocking issues
$readinessBlockingStr = if ($readiness.HaveReport -and @($readiness.BlockingIssues).Count -gt 0) {
    ($readiness.BlockingIssues | ForEach-Object { "- $_" }) -join "`n"
} else { "(no readiness report or no blocking issues)" }

# Next steps
$nextStepsLines = @()
if ($readinessBlocked) {
    $nextStepsLines += "1. Project tooling is BLOCKED - install test runner, linter, and coverage tool first"
    $nextStepsLines += "2. Run: scripts/check_quality_readiness.ps1 to verify toolchain setup"
    $nextStepsLines += "3. Update .agent/QUALITY_GATES.json with correct tool commands"
    $nextStepsLines += "4. Run: scripts/validate_task.ps1 -DryRun to preview gate execution"
    $nextStepsLines += "5. Run: scripts/validate_task.ps1 to execute real gates"
} elseif (-not $overallPass) {
    $nextStepsLines += "1. Review blocking failures above"
    $nextStepsLines += "2. Fix the failing gates and re-run validation"
    $nextStepsLines += "3. Do NOT proceed to Codex review until validation passes"
} else {
    $nextStepsLines += "1. All quality gates passed. Ready for Codex review."
    $nextStepsLines += "2. Run: scripts/codex_review.ps1"
}

$report = @"
# Validation Report

<!-- Auto-generated by scripts/validate_task.ps1 at $timestamp -->
<!-- Orchestrator runs this independently. Never trust Worker self-report. -->

## Task ID

$taskId

## Timestamp

$timestamp

## Project Readiness

$readinessNote

## TDD Enforcement

TDD Required: $tddLine

## Gate Results

| Gate | Command | Exit Code | Status | Detail |
|------|---------|-----------|--------|--------|
$gateTable

## Coverage Detail

| Metric | Actual | Required | Status |
|--------|--------|----------|--------|
$coverageTable

## File Scope Check

- Files changed: $scopeFilesStr
- All within scope: $scopeCheckDisplay
- Scope check status: $scopeCheckStatus
- Violations: $scopeViolationsStr

## Overall Verdict

**$overallVerdict**

## Blocking Failures

$blockingList

## Readiness Blocking Issues (from QUALITY_READINESS_REPORT.md)

$readinessBlockingStr

## Recommended Next Steps

$($nextStepsLines -join "`n")

## Enforcement Notes

- Source of truth: ``QUALITY_GATES.json``
- Any blocking gate failure = overall validation FAIL
- Coverage below threshold = BLOCKING failure
- Orchestrator must run gates independently (do not trust Worker self-report)
"@
Write-FileSafe -Path $ReportPath -Content $report

Write-Host ""
Write-Host "=========================================="
Write-Host " Validation Report: $ReportPath"
Write-Host " Overall: $overallVerdict"
Write-Host "=========================================="

# ---------------------------------------------------------------------------
# Generate E2E report
# ---------------------------------------------------------------------------
if ($GenerateE2EReport -or $DryRun) {
    $e2eLines = @()
    $e2eLines += "# Quality Gate End-to-End Report"
    $e2eLines += ""
    $e2eLines += "Generated: $timestamp"
    $e2eLines += ""
    $e2eLines += "## Readiness Verdict"
    $e2eLines += ""
    $e2eLines += "From: $ReadinessPath"
    $e2eLines += ""
    $e2eLines += "Verdict: **$($readiness.Verdict)**"
    $e2eLines += ""
    $e2eLines += "## Dry Run Command List"
    $e2eLines += ""
    foreach ($cmd in $dryRunCommandList) { $e2eLines += "$cmd" }
    $e2eLines += ""
    $e2eLines += "## Validation Dry Run Result"
    $e2eLines += ""
    $e2eLines += "Overall Verdict: **$overallVerdict**"
    $e2eLines += ""
    $e2eLines += "Gate count: $(@($gateResults).Count)"
    $e2eLines += ""
    $statusCounts = @{}
    foreach ($gr in $gateResults) {
        $s = $gr.Status
        if (-not $statusCounts.ContainsKey($s)) { $statusCounts[$s] = 0 }
        $statusCounts[$s]++
    }
    $e2eLines += "Status breakdown:"
    foreach ($sk in $statusCounts.Keys) { $e2eLines += "  - $sk`: $($statusCounts[$sk])" }
    $e2eLines += ""
    $e2eLines += "## Can Current Project Run Real Gates?"
    $e2eLines += ""
    $canRun = (-not $readinessBlocked) -and $overallPass
    $e2eLines += if ($canRun) { "**YES** - all gates have commands configured and readiness is not BLOCKED." } else { "**NO** - gates cannot execute. See blocking reasons below." }
    $e2eLines += ""
    $e2eLines += "## Blocking Reasons"
    $e2eLines += ""
    if (@($blockingFailures).Count -eq 0) {
        $e2eLines += "None."
    } else {
        foreach ($bf in $blockingFailures) { $e2eLines += "- $bf" }
    }
    $e2eLines += ""
    $e2eLines += "## Recommendation"
    $e2eLines += ""
    if ($readinessBlocked) {
        $e2eLines += "Project is BLOCKED. Install required tooling (vitest + eslint + typescript as appropriate), then re-run check_quality_readiness.ps1 and try again."
    } elseif (-not $overallPass) {
        $e2eLines += "Gates exist but some failed or are unavailable. Review blocking failures and fix configuration."
    } else {
        $e2eLines += "All gates are configured and ready. Proceed with real validation."
    }
    $e2eLines += ""
    $e2eLines += "## Files Referenced"
    $e2eLines += ""
    $e2eLines += "- QUALITY_GATES.json: .agent/QUALITY_GATES.json"
    $e2eLines += "- Readiness report: $ReadinessPath"
    $e2eLines += "- Validation report: $ReportPath"

    Write-FileSafe -Path $E2EReportPath -Content ($e2eLines -join "`n")
    Write-Host "E2E Report: $E2EReportPath"
}

if (-not $overallPass) { exit 1 } else { exit 0 }
