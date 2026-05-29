<#
.SYNOPSIS
    Assembles a Codex review package and calls Codex for adversarial review.
.DESCRIPTION
    Reads .agent/ files, collects git diff, assembles review prompt, calls Codex.
.PARAMETER PromptPath
    Default: .agent/codex-review-prompt.md
.PARAMETER ReviewPath
    Default: .agent/CODEX_REVIEW.md
.PARAMETER RawOutputPath
    Default: .agent/codex-review-raw.jsonl
.PARAMETER DryRun
    Generate prompt and placeholder review without calling Codex.
#>
param(
    [string]$PromptPath = ".agent/codex-review-prompt.md",
    [string]$ReviewPath = ".agent/CODEX_REVIEW.md",
    [string]$RawOutputPath = ".agent/codex-review-raw.jsonl",
    [switch]$DryRun,
    [string]$RawInputPathForTest = ""
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-FileSafe {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return "<file not found: $Path>" }
    return (Get-Content -Path $Path -Raw -Encoding UTF8)
}

function Write-FileSafe {
    param([string]$Path, [string]$Content)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    # Explicit UTF-8 without BOM. PS 5.1 Set-Content -Encoding UTF8 produces UTF-8
    # WITH BOM, which causes rendering artefacts in some viewers.
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Get-GitDiff {
    try {
        $isRepo = & git rev-parse --is-inside-work-tree 2>&1
        if ($LASTEXITCODE -ne 0) { return "(git diff unavailable: not a git repository)" }
        $diff = & git diff HEAD 2>&1
        if ($LASTEXITCODE -ne 0) { return "(git diff unavailable: command failed)" }
        $diffStr = ($diff | Out-String).Trim()
        if ([string]::IsNullOrWhiteSpace($diffStr)) { return "(no uncommitted changes)" }
        return $diffStr
    }
    catch { return "(git diff unavailable: $($_.Exception.Message))" }
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

function Get-RepoRoot {
    try {
        $root = & git rev-parse --show-toplevel 2>&1
        if ($LASTEXITCODE -eq 0) { return ($root | Out-String).Trim() }
        return (Get-Location).Path
    }
    catch { return (Get-Location).Path }
}

function Truncate-Text {
    param([string]$Text, [int]$MaxLen = 8000)
    if ($Text.Length -le $MaxLen) { return $Text }
    return $Text.Substring(0, $MaxLen) + "`n`n... (truncated at $MaxLen chars)"
}

# Read source files
$blueprint = Read-FileSafe ".agent/PROJECT_BLUEPRINT.md"
$projectState = Read-FileSafe ".agent/PROJECT_STATE.md"
$currentTask = Read-FileSafe ".agent/CURRENT_TASK.md"
$workReport = Read-FileSafe ".agent/WORK_REPORT.md"
$validationReport = Read-FileSafe ".agent/VALIDATION_REPORT.md"
$rubric = Read-FileSafe ".agent/CODEX_REVIEW_RUBRIC.md"
$taskId = Read-SectionValue -Path ".agent/CURRENT_TASK.md" -SectionName "Task ID"
$timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
$repoRoot = Get-RepoRoot
$gitDiff = Truncate-Text -Text (Get-GitDiff) -MaxLen 6000

# Build prompt
$pl = @()
$pl += "# Codex Adversarial Review Prompt"
$pl += ""
$pl += "## Your Role"
$pl += ""
$pl += "You are an external adversarial reviewer. You are NOT the implementer."
$pl += "Your job is to find failures, not to approve code."
$pl += "You may ONLY return one of three verdicts: PASS, NEED_FIX, or NEED_HUMAN."
$pl += ""
$pl += "## Review Rubric"
$pl += ""
$pl += "You MUST follow this rubric exactly. Do not deviate."
$pl += ""
$pl += $rubric
$pl += ""
$pl += "## Project Blueprint"
$pl += ""
$pl += $blueprint
$pl += ""
$pl += "## Project State"
$pl += ""
$pl += $projectState
$pl += ""
$pl += "## Current Task"
$pl += ""
$pl += $currentTask
$pl += ""
$pl += "## Worker Report"
$pl += ""
$pl += $workReport
$pl += ""
$pl += "## Local Validation Report"
$pl += ""
$pl += $validationReport
$pl += ""
$pl += "## Git Diff"
$pl += ""
$pl += "~~~diff"
$pl += $gitDiff
$pl += "~~~"
$pl += ""
$pl += "## Review Instructions"
$pl += ""
$pl += "1. Read each DoD item from the Current Task section above."
$pl += "2. For each DoD item, check the Git Diff for implementation AND test evidence."
$pl += "3. Cite file:line references for every finding. No evidence = invalid claim."
$pl += "4. Check file scope: all changed files must be within the declared file scope."
$pl += "5. Check for security issues (injection, XSS, hardcoded secrets)."
$pl += "6. Check for type safety issues (any types, unsafe casts)."
$pl += "7. If ANY BLOCKING issue exists, verdict = NEED_FIX."
$pl += "8. If you cannot determine correctness or need human input, verdict = NEED_HUMAN."
$pl += "9. If zero BLOCKING issues, verdict = PASS."
$pl += ""
$pl += "## Output Format"
$pl += ""
$pl += "You MUST output your review in this exact YAML structure:"
$pl += ""
$pl += "~~~yaml"
$pl += "verdict: PASS | NEED_FIX | NEED_HUMAN"
$pl += "confidence: high | medium | low"
$pl += "blocking_issues:"
$pl += "  - id: BI-001"
$pl += "    severity: BLOCKING"
$pl += "    issue: description"
$pl += "    evidence: file:line reference"
$pl += "    required_fix: concrete fix"
$pl += "required_fixes:"
$pl += "  - actionable fix for each blocking issue"
$pl += "non_blocking_suggestions:"
$pl += "  - issue: description"
$pl += "    rationale: why this matters but does not block"
$pl += "human_questions:"
$pl += "  - question: what needs human input"
$pl += "    options:"
$pl += "      - option A"
$pl += "      - option B"
$pl += "next_action: continue_next_task | fix_current_task | ask_human"
$pl += "~~~"
$pl += ""
$pl += "If there are no blocking issues, leave blocking_issues and required_fixes empty."
$pl += "If there are no human questions, leave human_questions empty."
$pl += "Remember: you are reviewing fresh. Judge solely against the spec, DoD items, and the diff."

$prompt = $pl -join "`n"
Write-FileSafe -Path $PromptPath -Content $prompt
Write-Host "Review prompt written to: $PromptPath"

# ---------------------------------------------------------------------------
# Shared review generator (used by DryRun, real run, and test mode)
# ---------------------------------------------------------------------------
function Write-CodexReview {
    param(
        [string]$Verdict,
        [string]$Confidence,
        $BlockingIssues,     # array of [PSCustomObject]{id,severity,issue,evidence,required_fix}
        $RequiredFixes,      # array of string
        $NonBlockingSuggestions,  # array of [PSCustomObject]{issue,rationale}
        $HumanQuestions,     # array of [PSCustomObject]{question,options}
        [string]$NextAction,
        [string]$DoDVerification,
        [string]$RawSection,   # raw section preserved when parse fails
        [string]$RawOutputPathUsed
    )
    # Format blocking issues
    $biSection = ""
    if (@($BlockingIssues).Count -eq 0) {
        if ($RawSection -ne "") {
            $biSection = "<!-- Parsed: none | raw preserved below -->`n$RawSection"
        } else {
            $biSection = "(none)"
        }
    } else {
        $lines = @()
        foreach ($bi in $BlockingIssues) {
            $lines += "- id: $($bi.id)"
            $lines += "  severity: $($bi.severity)"
            $lines += "  issue: $($bi.issue)"
            $lines += "  evidence: $($bi.evidence)"
            $lines += "  required_fix: $($bi.required_fix)"
        }
        $biSection = $lines -join "`n"
    }

    # Format required fixes
    $rfSection = ""
    if (@($RequiredFixes).Count -eq 0) {
        if ($RawSection -ne "" -and $Verdict -eq "NEED_FIX") {
            $rfSection = "<!-- Parsed: none | raw preserved below -->`n$RawSection"
        } else {
            $rfSection = "(none)"
        }
    } else {
        $rfSection = ($RequiredFixes | ForEach-Object { "- $_" }) -join "`n"
    }

    # Format suggestions
    $nsSection = ""
    if (@($NonBlockingSuggestions).Count -eq 0) {
        $nsSection = "(none)"
    } else {
        $lines = @()
        foreach ($ns in $NonBlockingSuggestions) {
            $lines += "- issue: $($ns.issue)"
            $lines += "  rationale: $($ns.rationale)"
        }
        $nsSection = $lines -join "`n"
    }

    # Format human questions
    $hqSection = ""
    if (@($HumanQuestions).Count -eq 0) {
        $hqSection = "(none)"
    } else {
        $lines = @()
        foreach ($hq in $HumanQuestions) {
            $lines += "- question: $($hq.question)"
            if ($null -ne $hq.options -and $hq.options.Count -gt 0) {
                $lines += "  options:"
                foreach ($opt in $hq.options) {
                    $lines += "    - $opt"
                }
            }
        }
        $hqSection = $lines -join "`n"
    }

    # If verdict is NEED_FIX but no fixes and no parse-failure raw section, that's a problem
    if ($Verdict -eq "NEED_FIX" -and @($RequiredFixes).Count -eq 0 -and @($BlockingIssues).Count -eq 0 -and $RawSection -eq "") {
        $NextAction = "ask_human"
        $prefix = if ($hqSection -eq "(none)") { "" } else { $hqSection + "`n" }
        $hqSection = $prefix + @(
            "- question: Verdict is NEED_FIX but required_fixes could not be parsed from Codex output. Manual review needed.",
            "  options:",
            "    - Review raw output and create fix task manually",
            "    - Re-run Codex review"
        ) -join "`n"
    }

    $rl = @()
    $rl += "# Codex Review"
    $rl += "<!-- Generated by scripts/codex_review.ps1 at $timestamp -->"
    $rl += "## Task ID"
    $rl += $taskId
    $rl += "## Timestamp"
    $rl += $timestamp
    $rl += "## Verdict"
    $rl += $Verdict
    $rl += "## Confidence"
    $rl += $Confidence
    $rl += "## DoD Verification"
    $rl += $DoDVerification
    $rl += "## Blocking Issues"
    $rl += $biSection
    $rl += "## Required Fixes"
    $rl += $rfSection
    $rl += "## Non-Blocking Suggestions"
    $rl += $nsSection
    $rl += "## Human Questions"
    $rl += $hqSection
    $rl += "## Next Action"
    $rl += $NextAction
    $rl += "## Raw Output Path"
    $rl += $RawOutputPathUsed

    Write-FileSafe -Path $ReviewPath -Content ($rl -join "`n")
    Write-Host ""
    Write-Host "=========================================="
    Write-Host " Codex Review: $ReviewPath"
    Write-Host " Verdict: $Verdict"
    Write-Host " Next Action: $NextAction"
    Write-Host "=========================================="
}

# ---------------------------------------------------------------------------
# DryRun
# ---------------------------------------------------------------------------
if ($DryRun) {
    Write-CodexReview -Verdict "NEED_HUMAN" -Confidence "N/A" `
        -BlockingIssues @() -RequiredFixes @() -NonBlockingSuggestions @() `
        -HumanQuestions @(
            [PSCustomObject]@{question="DryRun mode. Run without -DryRun for real review."
                options=@("Run codex_review.ps1 without -DryRun","Review manually")} ) `
        -NextAction "ask_human" -DoDVerification "| - | (DryRun: Codex not called) | N/A | N/A |" `
        -RawSection "" -RawOutputPathUsed $RawOutputPath
    Write-Host "Codex Review (DryRun): verdict=NEED_HUMAN, next_action=ask_human"
    exit 0
}

# ---------------------------------------------------------------------------
# Acquire raw review output (real Codex or test input)
# ---------------------------------------------------------------------------
$rawOutputStr = ""

if ($RawInputPathForTest -ne "") {
    Write-Host "Test mode: reading raw input from $RawInputPathForTest"
    $rawOutputStr = (Read-FileSafe $RawInputPathForTest).Trim()
    Write-FileSafe -Path $RawOutputPath -Content $rawOutputStr
    Write-Host "Raw output saved to: $RawOutputPath"
} else {
    # Check codex availability
    $codexAvailable = $false
    try { $null = & codex --version 2>&1; if ($LASTEXITCODE -eq 0) { $codexAvailable = $true } }
    catch { $codexAvailable = $false }

    if (-not $codexAvailable) {
        Write-CodexReview -Verdict "NEED_HUMAN" -Confidence "N/A" `
            -BlockingIssues @([PSCustomObject]@{id="BI-CLI-001";severity="BLOCKING";
                issue="codex CLI is not installed or not in PATH";evidence="codex --version failed";
                required_fix="Install Codex CLI"}) `
            -RequiredFixes @("Install Codex CLI and ensure it is in PATH") `
            -NonBlockingSuggestions @() `
            -HumanQuestions @([PSCustomObject]@{question="Codex CLI is unavailable. How should we proceed?"
                options=@("Install Codex CLI and retry","Skip Codex review and proceed manually")} ) `
            -NextAction "ask_human" `
            -DoDVerification "| - | (Codex CLI unavailable) | N/A | N/A |" `
            -RawSection "" -RawOutputPathUsed $RawOutputPath
        Write-Host "Codex CLI unavailable. Review written with verdict=NEED_HUMAN."
        exit 1
    }

    # Invoke Codex by piping the prompt via stdin (codex exec reads prompt from
    # stdin when "-" is passed). Passing the prompt as a command-line argument
    # breaks under PowerShell 5.1 native arg quoting: embedded double quotes in
    # the prompt get split into separate tokens (e.g. codex sees "WITH" as an
    # unexpected argument). stdin avoids the quoting layer entirely.
    Write-Host "Calling Codex CLI: <prompt> | codex exec --sandbox read-only --json -C $repoRoot -"
    $rawOutput = ""
    $exitCode = 0
    try {
        # Force UTF-8 on the pipe to native command (PS 5.1 defaults to ASCII,
        # which would mangle non-ASCII chars like em dashes in the prompt).
        $OutputEncoding = New-Object System.Text.UTF8Encoding $false
        # Redirect Codex stderr to a sidecar log instead of merging with 2>&1.
        # Codex emits diagnostic ERROR lines (e.g. a tool call blocked by the
        # read-only sandbox policy) on stderr even when it recovers and still
        # produces a final agent_message on stdout. Merging them via 2>&1 under
        # StrictMode + ErrorActionPreference=Stop turns the first stderr line
        # into a terminating error, discarding the real JSONL result. Keep
        # stderr separate and relax the preference for just this native call.
        $stderrLog = "$RawOutputPath.stderr.log"
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $rawOutput = $prompt | & codex exec --sandbox read-only --json -C $repoRoot - 2>$stderrLog
        $exitCode = $LASTEXITCODE
        $ErrorActionPreference = $prevEAP
    }
    catch { $exitCode = 1; $rawOutput = "Exception: $($_.Exception.Message)" }
    $rawOutputStr = ($rawOutput | Out-String).Trim()
    Write-FileSafe -Path $RawOutputPath -Content $rawOutputStr
    Write-Host "Raw output saved to: $RawOutputPath"
}

# ---------------------------------------------------------------------------
# Extract review text from raw output (handle JSONL wrapping)
# ---------------------------------------------------------------------------
$reviewText = ""
$parseSuccess = $false
$jsonlLines = @($rawOutputStr -split "`n" | Where-Object { $_.Trim() -ne "" })

# Quick StrictMode-safe property checker — Set-StrictMode Latest throws if
# we access a nonexistent property on a PSCustomObject, so guard with this.
function Test-Property {
    param($Obj, [string]$PropName)
    if ($null -eq $Obj) { return $false }
    return ($Obj.PSObject.Properties.Name -contains $PropName)
}

foreach ($jsonLine in $jsonlLines) {
    # Filter to JSONL lines before parsing; skip empty/whitespace-only lines
    $trimmed = $jsonLine.Trim()
    if ($trimmed -eq "") { continue }

    try {
        $obj = $trimmed | ConvertFrom-Json
    }
    catch {
        # Not valid JSON — skip (don't pollute review text with raw JSON noise)
        continue
    }

    # Codex 0.134 JSONL: the final structured verdict comes from the LAST
    # "item.completed" event whose nested item.type is "agent_message".
    # Earlier agent_messages are the model's narrative; we collect the last
    # one as the canonical structured output, but append all for richness.
    if (Test-Property $obj "item") {
        $inner = $obj.item
        $itemType = if (Test-Property $inner "type") { $inner.type } else { "" }
        if ($itemType -eq "agent_message" -and (Test-Property $inner "text")) {
            $txt = $inner.text
            if ($null -ne $txt -and $txt.ToString().Trim() -ne "") {
                $reviewText += $txt.ToString() + "`n"
            }
        }
    }

    # Top-level fields (older/alt shapes — belt and suspenders)
    $candidates = @("message", "content", "text", "output", "delta")
    foreach ($field in $candidates) {
        if (Test-Property $obj $field) {
            $val = $obj.$field
            if ($null -ne $val -and $val.ToString().Trim() -ne "") {
                $reviewText += $val.ToString() + "`n"
            }
        }
    }

    # If the JSON object itself has a verdict at top level
    if (Test-Property $obj "verdict") {
        $reviewText += "verdict: $($obj.verdict)`n"
        $parseSuccess = $true
    }
}

$reviewText = $reviewText.Trim()

# If JSONL yielded nothing useful, fall back to raw output
if ($reviewText -eq "" -or $reviewText.Length -lt 5) {
    $reviewText = $rawOutputStr
}

Write-Host "Extracted review text ($($reviewText.Length) chars)"

# ---------------------------------------------------------------------------
# Parse structured fields from review text
# ---------------------------------------------------------------------------
$verdict = "NEED_HUMAN"
$confidence = "low"
$blockingIssues = @()
$requiredFixes = @()
$nonBlockingSuggestions = @()
$humanQuestions = @()
$nextAction = "ask_human"
$dodVerification = "| - | (parse failed) | N/A | N/A |"
$rawPreservedSection = ""

# Extract top-level fields via regex
if ($reviewText -match '(?i)verdict:\s*(PASS|NEED_FIX|NEED_HUMAN)') {
    $verdict = $Matches[1].ToUpper(); $parseSuccess = $true
}
if ($reviewText -match '(?i)confidence:\s*(high|medium|low)') {
    $confidence = $Matches[1].ToLower()
}
if ($reviewText -match '(?i)next_action:\s*(continue_next_task|fix_current_task|ask_human)') {
    $nextAction = $Matches[1].ToLower()
}

# Parse blocking_issues block
# Pattern: blocking_issues: followed by list items with id/severity/issue/evidence/required_fix
$biBlock = [regex]::Match($reviewText, '(?si)blocking_issues:\s*\n(.*?)(?=^\S|\Z)')
if ($biBlock.Success) {
    $biText = $biBlock.Groups[1].Value
    # Split into individual issue objects (each starts with "- id:")
    $biEntries = [regex]::Matches($biText, '(?s)- id:\s*([^\n]*).*?(?=- id:|\Z)')
    foreach ($entry in $biEntries) {
        $entryText = $entry.Groups[0].Value
        $id = ""; $severity = "BLOCKING"; $issue = ""; $evidence = ""; $required_fix = ""
        if ($entryText -match '(?i)id:\s*([^\n]*)') { $id = $Matches[1].Trim() }
        if ($entryText -match '(?i)severity:\s*([^\n]*)') { $severity = $Matches[1].Trim() }
        if ($entryText -match '(?i)issue:\s*([^\n]*)') { $issue = $Matches[1].Trim() }
        if ($entryText -match '(?i)evidence:\s*([^\n]*)') { $evidence = $Matches[1].Trim() }
        if ($entryText -match '(?i)required_fix:\s*([^\n]*)') { $required_fix = $Matches[1].Trim() }
        if ($id -ne "" -or $issue -ne "") {
            $blockingIssues += [PSCustomObject]@{id=$id;severity=$severity;issue=$issue;evidence=$evidence;required_fix=$required_fix}
        }
    }
    # If no structured entries parsed, save raw block
    if (@($blockingIssues).Count -eq 0) {
        $rawPreservedSection = "blocking_issues:`n$biText"
    }
}

# Parse required_fixes list — stop at next YAML top-level key
$rfBlock = [regex]::Match($reviewText, '(?si)required_fixes:\s*((?:\n\s+-\s+[^\n]*)+)')
if ($rfBlock.Success) {
    $rfText = $rfBlock.Groups[1].Value
    $rfItems = $rfText -split "`n" | Where-Object { $_ -match '^\s*-\s+' }
    foreach ($item in $rfItems) {
        $cleaned = ($item.Trim() -replace '^\s*-\s*', '').Trim()
        if ($cleaned -ne "" -and $cleaned -notmatch '^(issue:|rationale:|question:|options?:)') {
            $requiredFixes += $cleaned
        }
    }
    if (@($requiredFixes).Count -eq 0 -and $rfText.Trim() -ne "") {
        if ($rawPreservedSection -ne "") { $rawPreservedSection += "`n`n" }
        $rawPreservedSection += "required_fixes:`n$rfText"
    }
}

# Parse non_blocking_suggestions — stop at next YAML top-level key
$nsBlock = [regex]::Match($reviewText, '(?si)non_blocking_suggestions:\s*((?:\s+- issue:.*(?:\n\s+rationale:.*)*)+)')
if ($nsBlock.Success) {
    $nsText = $nsBlock.Groups[1].Value
    $nsEntries = [regex]::Matches($nsText, '(?s)- issue:\s*([^\n]*).*?(?=- issue:|\Z)')
    foreach ($entry in $nsEntries) {
        $entryText = $entry.Groups[0].Value
        $nsIssue = ""; $rationale = ""
        if ($entryText -match '(?i)issue:\s*([^\n]*)') { $nsIssue = $Matches[1].Trim() }
        if ($entryText -match '(?i)rationale:\s*([^\n]*)') { $rationale = $Matches[1].Trim() }
        if ($nsIssue -ne "") {
            $nonBlockingSuggestions += [PSCustomObject]@{issue=$nsIssue;rationale=$rationale}
        }
    }
}

# Parse human_questions
$hqBlock = [regex]::Match($reviewText, '(?si)human_questions:\s*\n(.*?)(?=^\S|\Z)')
if ($hqBlock.Success) {
    $hqText = $hqBlock.Groups[1].Value
    $hqEntries = [regex]::Matches($hqText, '(?s)- question:\s*([^\n]*).*?(?=- question:|\Z)')
    foreach ($entry in $hqEntries) {
        $entryText = $entry.Groups[0].Value
        $qText = ""; $opts = @()
        if ($entryText -match '(?i)question:\s*([^\n]*)') { $qText = $Matches[1].Trim() }
        $optMatches = [regex]::Matches($entryText, '(?i)-\s*"([^"]*)"|-\s*([^\n]*)')
        foreach ($om in $optMatches) {
            $opt = if ($om.Groups[1].Success) { $om.Groups[1].Value } else { $om.Groups[2].Value.Trim() }
            if ($opt -ne "" -and $opt -notmatch 'question:') { $opts += $opt }
        }
        if ($qText -ne "") {
            $humanQuestions += [PSCustomObject]@{question=$qText;options=$opts}
        }
    }
}

# If verdict parsed but no structured content, preserve raw sections
if (-not $parseSuccess) {
    $verdict = "NEED_HUMAN"; $nextAction = "ask_human"
    $rawPreservedSection = $reviewText
    $humanQuestions += [PSCustomObject]@{
        question = "Failed to parse Codex output. Full raw output in $RawOutputPath."
        options = @("Review raw output manually","Re-run Codex review")
    }
}

# Fix next_action based on verdict
if ($nextAction -eq "ask_human" -and $verdict -eq "PASS") { $nextAction = "continue_next_task" }
elseif ($nextAction -eq "ask_human" -and $verdict -eq "NEED_FIX") { $nextAction = "fix_current_task" }

# Safety: NEED_FIX without fixes = ask_human
if ($verdict -eq "NEED_FIX" -and @($requiredFixes).Count -eq 0 -and @($blockingIssues).Count -eq 0) {
    $nextAction = "ask_human"
}

# Write the review
Write-CodexReview -Verdict $verdict -Confidence $confidence `
    -BlockingIssues $blockingIssues -RequiredFixes $requiredFixes `
    -NonBlockingSuggestions $nonBlockingSuggestions -HumanQuestions $humanQuestions `
    -NextAction $nextAction -DoDVerification $dodVerification `
    -RawSection $rawPreservedSection -RawOutputPathUsed $RawOutputPath

if ($verdict -eq "PASS") { exit 0 } else { exit 1 }
