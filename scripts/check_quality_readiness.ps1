<#
.SYNOPSIS
    Detects project toolchain and audits QUALITY_GATES.json readiness.
.DESCRIPTION
    Detects Node.js and/or Python toolchains, compares against current
    QUALITY_GATES.json, generates readiness report and suggested gates.
    Supports: Node (package.json) and Python (pyproject.toml/setup.cfg).
.PARAMETER ReportPath
    Default: .agent/QUALITY_READINESS_REPORT.md
.PARAMETER SuggestedPath
    Default: .agent/QUALITY_GATES_SUGGESTED.json
#>
param(
    [string]$ReportPath = ".agent/QUALITY_READINESS_REPORT.md",
    [string]$SuggestedPath = ".agent/QUALITY_GATES_SUGGESTED.json",
    [switch]$Verify
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$script:exitCode = 0

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
    if (($Command -match '\bexit 1\b') -and ($Command -notmatch '\b(vitest|jest|mocha|ava|tap|tape|node|python|pytest|go test|cargo test|dotnet test|rspec|unittest)\b')) {
        return $true
    }
    if ($Command -match '^\s*echo\s+' -and $Command -notmatch '\b(vitest|jest|mocha|ava|tap|tape)\b') {
        return $true
    }
    return $false
}

# ===========================================================================
# Detection: Project type
# ===========================================================================
function Detect-ProjectCandidates {
    <#
    Returns an array of pscustomobjects, one per detected project type.
    Each has: Type ("node"|"python"), Evidence (string describing what was found).
    #>
    $candidates = @()
    if (Test-Path "package.json") {
        $candidates += [pscustomobject]@{Type="node"; Evidence="package.json exists"}
    }
    $hasPython = (Test-Path "pyproject.toml") -or (Test-Path "setup.cfg") -or (Test-Path "setup.py")
    if ($hasPython) {
        $detail = @()
        if (Test-Path "pyproject.toml") { $detail += "pyproject.toml" }
        if (Test-Path "setup.cfg")       { $detail += "setup.cfg" }
        if (Test-Path "setup.py")        { $detail += "setup.py" }
        $candidates += [pscustomobject]@{Type="python"; Evidence=($detail -join ", ") + " exists"}
    }
    if ($candidates.Count -eq 0) {
        $candidates += [pscustomobject]@{Type="unknown"; Evidence="No package.json, pyproject.toml, setup.cfg, or setup.py found"}
    }
    return $candidates
}

# ===========================================================================
# Detection: Node.js
# ===========================================================================
function New-ToolchainResult {
    param(
        [string[]]$ProjectTypes,
        [string]$PackageManager,
        [string]$TestRunner,    $TestCommand,    [string]$TestEvidence,
        [string]$Linter,        $LintCommand,    [string]$LintEvidence,
        [string]$Typechecker,   $TypecheckCommand, [string]$TypecheckEvidence,
        [string]$CoverageTool,  $CoverageCommand, [string]$CoverageEvidence,
        [string]$Confidence,
        [string[]]$Warnings
    )
    # [string] type constraint on command parameters coerces $null to "",
    # which breaks the $null -eq $suggested check in Compare-Gates.
    # Remove type constraint so $null stays $null.
    [pscustomobject]@{
        ProjectTypes       = $ProjectTypes
        PackageManager     = $PackageManager
        TestRunner         = $TestRunner
        TestCommand        = $TestCommand
        TestEvidence       = $TestEvidence
        Linter             = $Linter
        LintCommand        = $LintCommand
        LintEvidence       = $LintEvidence
        Typechecker        = $Typechecker
        TypecheckCommand   = $TypecheckCommand
        TypecheckEvidence  = $TypecheckEvidence
        CoverageTool       = $CoverageTool
        CoverageCommand    = $CoverageCommand
        CoverageEvidence   = $CoverageEvidence
        Confidence         = $Confidence
        Warnings           = $Warnings
    }
}

function Detect-NodeToolchain {
    $warnings = @()
    $pkg = Read-JsonSafe "package.json"
    if ($null -eq $pkg) {
        return New-ToolchainResult -ProjectTypes @("node") -PackageManager "unknown" `
            -TestRunner "unknown" -TestCommand $null -TestEvidence "" `
            -Linter "unknown" -LintCommand $null -LintEvidence "" `
            -Typechecker "unknown" -TypecheckCommand $null -TypecheckEvidence "" `
            -CoverageTool "unknown" -CoverageCommand $null -CoverageEvidence "" `
            -Confidence "low" -Warnings @("package.json exists but could not be parsed as JSON")
    }

    # Scripts and deps
    $scripts = @{}
    if ($null -ne $pkg.scripts) {
        $pkg.scripts.PSObject.Properties | ForEach-Object { $scripts[$_.Name] = $_.Value }
    }
    $deps = @{}
    foreach ($ds in @("devDependencies", "dependencies")) {
        $prop = $pkg.PSObject.Properties | Where-Object { $_.Name -eq $ds }
        if ($prop) { $pkg.$ds.PSObject.Properties | ForEach-Object { $deps[$_.Name] = $_.Value } }
    }

    # Package manager
    $pm = "npm"
    if      (Test-Path "pnpm-lock.yaml") { $pm = "pnpm" }
    elseif  (Test-Path "yarn.lock")      { $pm = "yarn" }
    elseif  (Test-Path "bun.lockb")      { $pm = "bun" }
    elseif  (-not (Test-Path "package-lock.json")) { $pm = "npm (no lock file)" }

    # Normalize PM for command generation (pnpm/yarn/bun use different run/exec prefixes)
    if ($pm -eq "pnpm")        { $pmRun = "pnpm"; $pmExec = "pnpm exec" }
    elseif ($pm -eq "yarn")    { $pmRun = "yarn"; $pmExec = "yarn" }
    elseif ($pm -eq "bun")     { $pmRun = "bun run"; $pmExec = "bunx" }
    else                       { $pmRun = "npm run"; $pmExec = "npx" }

    # Test
    $tRunner = "unknown"; $tCmd = $null; $tEv = ""
    if ($deps.ContainsKey("vitest") -or (Test-Path "vitest.config.js") -or (Test-Path "vitest.config.ts")) {
        $tRunner = "vitest"; $tEv = "vitest in dependencies + vitest.config.*"
        $tCmd = if ($scripts.ContainsKey("test")) { "$pmRun test" } else { "${pmExec} vitest run" }
    } elseif ($deps.ContainsKey("jest") -or (Test-Path "jest.config.js") -or (Test-Path "jest.config.ts")) {
        $tRunner = "jest"; $tEv = "jest in dependencies + jest.config.*"
        $tCmd = if ($scripts.ContainsKey("test")) { "$pmRun test" } else { "${pmExec} jest" }
    } elseif ($deps.ContainsKey("mocha") -or (Test-Path ".mocharc.js") -or (Test-Path ".mocharc.json")) {
        $tRunner = "mocha"; $tEv = "mocha in dependencies"
        $tCmd = if ($scripts.ContainsKey("test")) { "$pmRun test" } else { "${pmExec} mocha" }
    } elseif ($scripts.ContainsKey("test")) {
        $raw = $scripts["test"]
        if (Test-IsPlaceholderTestScript -Command $raw) {
            $tRunner = "placeholder script"; $tEv = "test script is npm default placeholder"
        } elseif ($raw -match "vitest") {
            $tRunner = "vitest (script)"; $tCmd = "$pmRun test"; $tEv = "test script references vitest"
        } elseif ($raw -match "jest") {
            $tRunner = "jest (script)"; $tCmd = "$pmRun test"; $tEv = "test script references jest"
        } else {
            $tRunner = "custom script"; $tCmd = "$pmRun test"; $tEv = "test script exists (custom)"
        }
    }

    # Lint
    $linter = "unknown"; $lCmd = $null; $lEv = ""
    $hasEslint = $deps.ContainsKey("eslint") -or (Test-Path "eslint.config.js") -or (Test-Path "eslint.config.mjs") -or (Test-Path ".eslintrc") -or (Test-Path ".eslintrc.json")
    $hasBiome  = $deps.ContainsKey("biome") -or (Test-Path "biome.json")
    if ($hasEslint) {
        $linter = "eslint"; $lEv = "eslint in dependencies + config file"
        $lCmd = if ($scripts.ContainsKey("lint")) { "${pmRun} lint" } else { "${pmExec} eslint src/" }
    } elseif ($hasBiome) {
        $linter = "biome"; $lEv = "biome in dependencies + biome.json"
        $lCmd = if ($scripts.ContainsKey("lint")) { "${pmRun} lint" } else { "${pmExec} biome check ." }
    }

    # Typecheck
    $tc = "unknown"; $tcCmd = $null; $tcEv = ""
    if (Test-Path "tsconfig.json") {
        $tc = "tsc"; $tcEv = "tsconfig.json exists"
        $tcCmd = if ($scripts.ContainsKey("typecheck")) { "${pmRun} typecheck" } elseif ($deps.ContainsKey("typescript")) { "${pmExec} tsc --noEmit" } else { "${pmExec} tsc --noEmit" }
    } elseif (Test-Path "jsconfig.json") {
        $tc = "jsconfig (type acquisition)"; $tcEv = "jsconfig.json exists"
    }

    # Coverage
    $covTool = "unknown"; $covCmd = $null; $covEv = ""
    if ($tRunner -like "vitest*") {
        $covTool = "vitest built-in"; $covEv = "vitest --coverage"
        $covCmd = if ($scripts.ContainsKey("test:coverage")) { "${pmRun} test:coverage" } elseif ($scripts.ContainsKey("coverage")) { "${pmRun} coverage" } else { "${pmExec} vitest run --coverage" }
    } elseif ($tRunner -like "jest*") {
        $covTool = "jest built-in"; $covEv = "jest --coverage"
        $covCmd = if ($scripts.ContainsKey("test:coverage")) { "${pmRun} test:coverage" } elseif ($scripts.ContainsKey("coverage")) { "${pmRun} coverage" } else { "${pmExec} jest --coverage" }
    }
    $hasNyc = $deps.ContainsKey("nyc") -or (Test-Path "nyc.config.js") -or (Test-Path ".nycrc")
    $hasC8  = $deps.ContainsKey("c8")
    if ($hasNyc) {
        $covTool = "nyc"; $covEv = "nyc in dependencies"
        $covCmd = "${pmExec} nyc " + $(if ($tCmd) { $tCmd } else { "$pmRun test" })
    } elseif ($hasC8) {
        $covTool = "c8"; $covEv = "c8 in dependencies"
        $covCmd = "${pmExec} c8 " + $(if ($tCmd) { $tCmd } else { "$pmRun test" })
    }

    $confidence = "high"
    return New-ToolchainResult -ProjectTypes @("node") -PackageManager $pm `
        -TestRunner $tRunner -TestCommand $tCmd -TestEvidence $tEv `
        -Linter $linter -LintCommand $lCmd -LintEvidence $lEv `
        -Typechecker $tc -TypecheckCommand $tcCmd -TypecheckEvidence $tcEv `
        -CoverageTool $covTool -CoverageCommand $covCmd -CoverageEvidence $covEv `
        -Confidence $confidence -Warnings $warnings
}

# ===========================================================================
# Detection: Python
# ===========================================================================
function Read-TomlSafe {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    try {
        # Try Python 3.11+ tomllib for structured parse
        $pyResult = & python -c @"
import json, sys
try:
    import tomllib
    with open(sys.argv[1], 'rb') as f:
        data = tomllib.load(f)
    print(json.dumps({'ok':True,'data':data}))
except Exception as e:
    print(json.dumps({'ok':False,'error':str(e)}))
"@ $Path 2>$null
        if ($LASTEXITCODE -eq 0 -and $pyResult) {
            $parsed = $pyResult | ConvertFrom-Json
            if ($parsed.ok) { return $parsed.data }
        }
    } catch {}
    # Fallback: return raw text for keyword matching
    try { return (Get-Content -Path $Path -Raw -Encoding UTF8) } catch { return $null }
}

function Test-TomlDep {
    param($TomlData, [string]$Name)
    if ($null -eq $TomlData) { return $false }
    # If we have structured data from tomllib
    if ($TomlData -is [PSCustomObject] -or $TomlData -is [hashtable]) {
        # Check [project] dependencies
        $project = if ($TomlData.PSObject.Properties.Name -contains "project") { $TomlData.project } else { $null }
        if ($project) {
            $depSections = @("dependencies", "optional-dependencies")
            foreach ($sec in $depSections) {
                if ($project.PSObject.Properties.Name -contains $sec) {
                    $deps = $project.$sec
                    if ($deps -is [array]) {
                        foreach ($d in $deps) { if ("$d" -match [regex]::Escape($Name)) { return $true } }
                    }
                }
            }
        }
        # Check [tool] sections
        $tool = if ($TomlData.PSObject.Properties.Name -contains "tool") { $TomlData.tool } else { $null }
        if ($tool) {
            if ($tool.PSObject.Properties.Name -contains $Name) { return $true }
            foreach ($prop in @("pytest", "ruff", "mypy", "coverage")) {
                if ($tool.PSObject.Properties.Name -contains $prop -and $Name -eq $prop) { return $true }
            }
        }
    }
    # Fallback: keyword match on raw text (heuristic, low confidence)
    if ($TomlData -is [string]) {
        # Only match non-comment lines to reduce false positives
        $nonComment = ($TomlData -split "`n" | Where-Object { $_ -notmatch '^\s*#' }) -join "`n"
        return ($nonComment -match "(?m)$([regex]::Escape($Name))\s*[=~><]")
    }
    return $false
}

function Detect-PythonToolchain {
    $warnings = @()
    $confidence = "high"

    $tomlData = Read-TomlSafe "pyproject.toml"
    if ($null -eq $tomlData -and (Test-Path "pyproject.toml")) {
        $warnings += "pyproject.toml exists but could not be parsed"
        $confidence = "low"
    }
    if ($tomlData -is [string]) {
        $warnings += "TOML parser (tomllib) not available; using keyword matching — may miss optional deps or match commented-out lines"
        $confidence = "low"
    }

    # Package manager
    $pm = "pip"
    if      (Test-Path "poetry.lock") { $pm = "poetry" }
    elseif  (Test-Path "Pipfile.lock") { $pm = "pipenv" }
    elseif  (Test-Path "uv.lock")      { $pm = "uv" }
    elseif  (Test-Path "pdm.lock")     { $pm = "pdm" }
    elseif  ((Test-Path "requirements.txt") -or (Test-Path "requirements-dev.txt")) { $pm = "pip (requirements)" }

    # Test
    $tRunner = "unknown"; $tCmd = $null; $tEv = ""
    if ((Test-TomlDep $tomlData "pytest") -or (Test-Path "pytest.ini") -or (Test-Path "conftest.py") -or ((Test-Path "pyproject.toml") -and ($tomlData -is [string]) -and ((Get-Content "pyproject.toml" -Raw -Encoding UTF8) -match '\[tool\.pytest\]'))) {
        $tRunner = "pytest"; $tCmd = "python -m pytest"; $tEv = "pytest in pyproject.toml or pytest.ini/conftest.py found"
    } elseif (Test-Path "tests") {
        $tRunner = "unittest"; $tCmd = "python -m unittest discover"; $tEv = "tests/ directory found"
    }

    # Lint
    $linter = "unknown"; $lCmd = $null; $lEv = ""
    if (Test-TomlDep $tomlData "ruff") {
        $linter = "ruff"; $lCmd = "ruff check ."; $lEv = "ruff in pyproject.toml"
    } elseif (Test-TomlDep $tomlData "flake8") {
        $linter = "flake8"; $lCmd = "flake8 ."; $lEv = "flake8 in pyproject.toml"
    } elseif (Test-Path ".flake8") {
        $linter = "flake8"; $lCmd = "flake8 ."; $lEv = ".flake8 config found"
    }

    # Typecheck
    $tc = "unknown"; $tcCmd = $null; $tcEv = ""
    if ((Test-TomlDep $tomlData "mypy") -or (Test-Path "mypy.ini")) {
        $tc = "mypy"; $tcCmd = "mypy ."; $tcEv = "mypy in pyproject.toml or mypy.ini found"
    }

    # Coverage
    $covTool = "unknown"; $covCmd = $null; $covEv = ""
    if (Test-TomlDep $tomlData "pytest-cov") {
        $covTool = "pytest-cov"; $covCmd = "python -m pytest --cov=. --cov-report=term"; $covEv = "pytest-cov in pyproject.toml"
    } elseif (Test-TomlDep $tomlData "coverage") {
        $covTool = "coverage.py"; $covCmd = "coverage run -m pytest; coverage report"; $covEv = "coverage in pyproject.toml"
    } elseif (Test-Path ".coveragerc") {
        $covTool = "coverage.py"; $covCmd = "coverage run -m pytest"; $covEv = ".coveragerc found"
    }

    # Additional config files as evidence
    $extraEvidence = @()
    if (Test-Path "tox.ini")       { $extraEvidence += "tox.ini" }
    if (Test-Path "noxfile.py")    { $extraEvidence += "noxfile.py" }
    if (Test-Path "Makefile")      { $extraEvidence += "Makefile" }
    if ($extraEvidence.Count -gt 0) {
        $warnings += "Additional build/test config files found: $($extraEvidence -join ', '). Review manually."
    }

    return New-ToolchainResult -ProjectTypes @("python") -PackageManager $pm `
        -TestRunner $tRunner -TestCommand $tCmd -TestEvidence $tEv `
        -Linter $linter -LintCommand $lCmd -LintEvidence $lEv `
        -Typechecker $tc -TypecheckCommand $tcCmd -TypecheckEvidence $tcEv `
        -CoverageTool $covTool -CoverageCommand $covCmd -CoverageEvidence $covEv `
        -Confidence $confidence -Warnings $warnings
}

# ===========================================================================
# Audit: Compare detected tools against QUALITY_GATES.json
# ===========================================================================
function Compare-Gates {
    param($Toolchain, $CurrentGates)
    <#
    Returns an array of per-gate comparison results:
    Gate, CurrentCommand, SuggestedCommand, MatchStatus, IsMissing
    #>
    $results = @()
    if ($null -eq $CurrentGates -or $null -eq $CurrentGates.gates) {
        $badShape = $true
    } else { $badShape = $false }

    foreach ($gateName in @("test","lint","typecheck","coverage")) {
        $gateObj = if (-not $badShape -and $null -ne $CurrentGates.gates.$gateName) {
            $CurrentGates.gates.$gateName
        } else { $null }

        $currentCmd = if ($gateObj) { $gateObj.command } else { "N/A" }

        # Check enabled field: if explicitly false, the gate is intentionally disabled
        $isDisabled = $false
        if ($gateObj) {
            $enabledVal = $gateObj.PSObject.Properties | Where-Object { $_.Name -eq "enabled" }
            if ($enabledVal -and $enabledVal.Value -eq $false) { $isDisabled = $true }
        }

        $suggested = $null
        $isMissing = $false
        switch ($gateName) {
            "test"      { $suggested = $Toolchain.TestCommand;    $isMissing = ($null -eq $suggested) }
            "lint"      { $suggested = $Toolchain.LintCommand;    $isMissing = ($null -eq $suggested) }
            "typecheck" { $suggested = $Toolchain.TypecheckCommand; $isMissing = ($null -eq $suggested) }
            "coverage"  { $suggested = $Toolchain.CoverageCommand; $isMissing = ($null -eq $suggested) }
        }

        $matchStatus = if ($isDisabled) { "SKIPPED_DISABLED" }
        elseif ($isMissing) { "MISSING_TOOL" }
        elseif ($currentCmd -eq $suggested) { "MATCH" }
        elseif ($currentCmd -eq "N/A" -or $currentCmd -eq "") { "MISSING_CONFIG" }
        else { "MISMATCH" }

        $displayCurrent  = if ($currentCmd) { $currentCmd } else { "N/A" }
        $displaySuggested = if ($suggested) { $suggested } else { "(needs config)" }

        $results += [pscustomobject]@{
            Gate              = $gateName
            CurrentCommand    = $displayCurrent
            SuggestedCommand  = $displaySuggested
            MatchStatus       = $matchStatus
            IsMissing         = $isMissing
            IsDisabled        = $isDisabled
        }
    }
    return $results
}

# ===========================================================================
# Audit: Policy decision
# ===========================================================================
function Resolve-ReadinessVerdict {
    param($GateComparisons, $Toolchain)

    $verdict = "READY"
    $blocking = @()

    foreach ($cmp in $GateComparisons) {
        if ($cmp.IsDisabled) { continue }
        if ($cmp.IsMissing) {
            switch ($cmp.Gate) {
                "test"      { $verdict = "BLOCKED"; $blocking += "No test runner detected. Test gate cannot execute." }
                "lint"      { $blocking += "No linter detected. Lint gate cannot execute."; if ($verdict -ne "BLOCKED") { $verdict = "NEEDS_CONFIG" } }
                "typecheck" { $blocking += "No typechecker detected. Typecheck gate cannot execute."; if ($verdict -ne "BLOCKED") { $verdict = "NEEDS_CONFIG" } }
                "coverage"  { $verdict = "BLOCKED"; $blocking += "No coverage tool detected. Coverage gate (100% threshold) cannot execute." }
            }
        } elseif ($cmp.MatchStatus -in @("MISSING_CONFIG","MISMATCH")) {
            if ($verdict -ne "BLOCKED") { $verdict = "NEEDS_CONFIG" }
            $blocking += "$($cmp.Gate) gate: current command does not match suggested. Run with -DryRun or update QUALITY_GATES.json."
        }
    }

    if ($Toolchain.TestRunner -eq "placeholder script") {
        $verdict = "BLOCKED"
        $blocking += "package.json test script is an npm default placeholder. Replace with a real test command."
    }
    if ($Toolchain.Confidence -eq "low" -and $verdict -eq "READY") {
        $verdict = "NEEDS_CONFIG"
        $blocking += "Toolchain detection confidence is LOW (heuristic only). Verify manually."
    }
    if ($Toolchain.Warnings.Count -gt 0 -and $verdict -eq "READY") {
        $verdict = "NEEDS_CONFIG"
    }

    return @{Verdict=$verdict; BlockingIssues=$blocking}
}

# ===========================================================================
# Report: Suggested gates and readiness report
# ===========================================================================
function Write-SuggestedGatesFile {
    param($Toolchain, $Path, $Timestamp)

    $suggested = @{
        version = "1.0"
        tdd_required = $true
        gates = @{
            test = @{
                enabled = ($null -ne $Toolchain.TestCommand)
                command = $Toolchain.TestCommand
                blocking = $true
                description = if ($Toolchain.TestCommand) { "All tests must pass" } else { "NEEDS CONFIG: install a test runner (vitest/jest for Node, pytest for Python)" }
            }
            lint = @{
                enabled = ($null -ne $Toolchain.LintCommand)
                command = $Toolchain.LintCommand
                blocking = $true
                description = if ($Toolchain.LintCommand) { "No lint errors allowed" } else { "NEEDS CONFIG: install a linter (eslint for Node, ruff/flake8 for Python)" }
            }
            typecheck = @{
                enabled = ($null -ne $Toolchain.TypecheckCommand)
                command = $Toolchain.TypecheckCommand
                blocking = $true
                description = if ($Toolchain.TypecheckCommand) { "No type errors allowed" } else { "NEEDS CONFIG: install TypeScript or mypy" }
            }
            coverage = @{
                enabled = ($null -ne $Toolchain.CoverageCommand)
                command = $Toolchain.CoverageCommand
                blocking = $true
                threshold = @{lines=100;branches=100;functions=100;statements=100}
                description = if ($Toolchain.CoverageCommand) { "100% coverage required. Below threshold = BLOCKING failure." } else { "NEEDS CONFIG: install a coverage tool. Threshold remains at 100%." }
            }
        }
        enforcement = @{
            any_gate_fail_means_validation_fail = $true
            coverage_below_threshold_is_blocking = $true
            orchestrator_must_run_gates_independently = $true
            do_not_trust_worker_self_report = $true
        }
        metadata = @{
            project_types        = $Toolchain.ProjectTypes
            package_manager      = $Toolchain.PackageManager
            test_runner          = $Toolchain.TestRunner
            linter               = $Toolchain.Linter
            typechecker          = $Toolchain.Typechecker
            coverage_tool        = $Toolchain.CoverageTool
            detection_confidence = $Toolchain.Confidence
            detection_warnings   = $Toolchain.Warnings
            generated_at         = $Timestamp
            note                 = "Suggestion only. Does not override QUALITY_GATES.json."
        }
    }
    $json = $suggested | ConvertTo-Json -Depth 5
    Write-FileSafe -Path $Path -Content $json
}

function Write-ReadinessReportFile {
    param($Toolchain, $GateComparisons, $Verdict, $BlockingIssues, $ReportPath, $SuggestedPath, $Timestamp)

    $auditTable = ($GateComparisons | ForEach-Object {
        "| $($_.Gate) | ``$($_.CurrentCommand)`` | ``$($_.SuggestedCommand)`` | $($_.MatchStatus) |"
    }) -join "`n"

    $blockingList = if (@($BlockingIssues).Count -eq 0) { "None." } else { ($BlockingIssues | ForEach-Object { "- $_" }) -join "`n" }

    $warningsSection = if ($Toolchain.Warnings.Count -gt 0) {
        ($Toolchain.Warnings | ForEach-Object { "- $_" }) -join "`n"
    } else { "(none)" }

    $projectTypeStr = ($Toolchain.ProjectTypes -join ", ")

    $nextSteps = @()
    if ($Verdict -eq "BLOCKED") {
        if ($Toolchain.ProjectTypes -contains "node") {
            $nextSteps += "1. Install test runner: npm install --save-dev vitest (or jest)"
            $nextSteps += "2. Install linter: npm install --save-dev eslint"
            $nextSteps += "3. Add test/lint scripts to package.json"
        }
        if ($Toolchain.ProjectTypes -contains "python") {
            $nextSteps += "1. Install test runner: pip install pytest"
            $nextSteps += "2. Install linter: pip install ruff (or flake8)"
            $nextSteps += "3. Add [tool.pytest.ini_options] and [tool.ruff] to pyproject.toml"
        }
        if ($Toolchain.ProjectTypes -contains "unknown") {
            $nextSteps += "1. Set up a test runner for your language"
            $nextSteps += "2. Install a linter"
            $nextSteps += "3. Configure .agent/QUALITY_GATES.json with your commands"
        }
        $nextSteps += "4. Run this script again to verify toolchain"
        $nextSteps += "5. If typecheck is not applicable, set typecheck gate enabled=false in QUALITY_GATES.json"
    } elseif ($Verdict -eq "NEEDS_CONFIG") {
        $nextSteps += "1. Update .agent/QUALITY_GATES.json to match suggested commands"
        $nextSteps += "2. Run validate_task.ps1 -DryRun to verify gate commands resolve"
    } else {
        $nextSteps += "1. Run validate_task.ps1 -DryRun to verify all gate commands resolve correctly"
        $nextSteps += "2. Run validate_task.ps1 to perform first local validation"
    }

    $report = @"
# Quality Readiness Report

Generated: $Timestamp

## Project Detection

| Property | Value |
|----------|-------|
| Project Types | $projectTypeStr |
| Package Manager | $($Toolchain.PackageManager) |
| Test Runner | $($Toolchain.TestRunner) |
| Linter | $($Toolchain.Linter) |
| Typechecker | $($Toolchain.Typechecker) |
| Coverage Tool | $($Toolchain.CoverageTool) |
| Detection Confidence | $($Toolchain.Confidence) |

## Detection Evidence

- Test: $($Toolchain.TestEvidence -replace "`n", " ")
- Lint: $($Toolchain.LintEvidence -replace "`n", " ")
- Typecheck: $($Toolchain.TypecheckEvidence -replace "`n", " ")
- Coverage: $($Toolchain.CoverageEvidence -replace "`n", " ")

## Detection Warnings

$warningsSection

## QUALITY_GATES.json Command Audit

| Gate | Current Command | Suggested Command | Match |
|------|-----------------|-------------------|-------|
$auditTable

## Coverage Threshold

Threshold is 100% for lines/branches/functions/statements. This is an MVP hard requirement.
Missing coverage tool does NOT lower the threshold -- it means the project is BLOCKED until tooling is set up.

## Readiness Verdict

**$Verdict**

## Blocking Issues

$blockingList

## Files Created

- Suggestion: $SuggestedPath
- This report: $ReportPath

## Next Steps

$($nextSteps -join "`n")

> Note: QUALITY_GATES.json has NOT been modified. This report and the suggested JSON are advisory only.
"@
    Write-FileSafe -Path $ReportPath -Content $report
}

# ===========================================================================
# Verify: actually execute gate commands (optional)
# ===========================================================================
function Invoke-VerifyGates {
    param($GateComparisons)

    $verifyResults = @()
    foreach ($cmp in $GateComparisons) {
        if ($cmp.IsDisabled) {
            $verifyResults += [pscustomobject]@{Gate=$cmp.Gate; ExitCode="SKIPPED"; Status="disabled in config"; Output=""}
            continue
        }
        $cmd = $cmp.CurrentCommand
        if ($cmd -eq "N/A" -or [string]::IsNullOrWhiteSpace($cmd)) {
            $verifyResults += [pscustomobject]@{Gate=$cmp.Gate; ExitCode="SKIPPED"; Status="no command configured"; Output=""}
            continue
        }
        Write-Host "Verify $($cmp.Gate): $cmd"
        try {
            $output = & cmd.exe /c "$cmd 2>&1" 2>&1 | Out-String
            $ec = $LASTEXITCODE
            $status = if ($ec -eq 0) { "PASS" } else { "FAIL (exit $ec)" }
            # Truncate output for report
            if ($output.Length -gt 400) { $output = $output.Substring(0, 400) + "...(truncated)" }
            $verifyResults += [pscustomobject]@{Gate=$cmp.Gate; ExitCode=$ec; Status=$status; Output=$output.Trim()}
            Write-Host "  -> $status"
        } catch {
            $verifyResults += [pscustomobject]@{Gate=$cmp.Gate; ExitCode="ERROR"; Status="execution error"; Output=$_.Exception.Message}
            Write-Host "  -> execution error"
        }
    }
    return $verifyResults
}

# ===========================================================================
# Main
# ===========================================================================
$timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")

# 1. Detect project candidates
$candidates = Detect-ProjectCandidates

# 2. Pick primary and detect toolchain
# For mixed projects: prefer Node (package.json is more standard for gates),
# but also try Python if Node detection yields nothing.
$toolchain = $null
foreach ($c in $candidates) {
    if ($c.Type -eq "node") {
        $toolchain = Detect-NodeToolchain
        break
    }
}
if ($null -eq $toolchain) {
    foreach ($c in $candidates) {
        if ($c.Type -eq "python") {
            $toolchain = Detect-PythonToolchain
            break
        }
    }
}
if ($null -eq $toolchain) {
    # Unknown project
    $toolchain = New-ToolchainResult -ProjectTypes @("unknown") -PackageManager "unknown" `
        -TestRunner "unknown" -TestCommand $null -TestEvidence "" `
        -Linter "unknown" -LintCommand $null -LintEvidence "" `
        -Typechecker "unknown" -TypecheckCommand $null -TypecheckEvidence "" `
        -CoverageTool "unknown" -CoverageCommand $null -CoverageEvidence "" `
        -Confidence "low" -Warnings @("No recognized project type detected. Quality gates will need manual configuration.")
}

# 3. Compare against current gates
$currentGates = Read-JsonSafe ".agent/QUALITY_GATES.json"
$comparisons = Compare-Gates -Toolchain $toolchain -CurrentGates $currentGates

# 4. Resolve readiness verdict
$resolution = Resolve-ReadinessVerdict -GateComparisons $comparisons -Toolchain $toolchain

# 5. Write outputs
Write-SuggestedGatesFile -Toolchain $toolchain -Path $SuggestedPath -Timestamp $timestamp
Write-ReadinessReportFile -Toolchain $toolchain -GateComparisons $comparisons `
    -Verdict $resolution.Verdict -BlockingIssues $resolution.BlockingIssues `
    -ReportPath $ReportPath -SuggestedPath $SuggestedPath -Timestamp $timestamp


# 6. Verify (optional — actually execute gate commands)
$VerifyFailed = $false
if ($Verify) {
    Write-Host ""
    Write-Host "--- Verifying gate commands (actual execution) ---"
    $verifyResults = Invoke-VerifyGates -GateComparisons $comparisons

    # Append verify results to the report
    $vTable = ($verifyResults | ForEach-Object {
        "| $($_.Gate) | $($_.ExitCode) | $($_.Status) |"
    }) -join "`n"
    $vSection = @"

## Verify Results (actual execution)

| Gate | Exit Code | Status |
|------|-----------|--------|
$vTable

"@
    Add-Content -Path $ReportPath -Value $vSection -Encoding UTF8
    Write-Host "Verify results appended to: $ReportPath"

    $failedVerify = $verifyResults | Where-Object {
        $_.ExitCode -eq "ERROR" -or ($_.ExitCode -is [int] -and $_.ExitCode -ne 0)
    }
    if ($failedVerify) {
        Write-Host "Verify FAILED for $($failedVerify.Count) gate(s)."
        $script:exitCode = 1
    }
}

Write-Host ""
Write-Host "=========================================="
Write-Host " Readiness Report: $ReportPath"
Write-Host " Suggested Gates: $SuggestedPath"
Write-Host " Verdict: $($resolution.Verdict)"
Write-Host "=========================================="

if ($script:exitCode -ne 1) {
    if ($resolution.Verdict -eq "BLOCKED")      { $script:exitCode = 1 }
    elseif ($resolution.Verdict -eq "NEEDS_CONFIG") { $script:exitCode = 2 }
}
exit $script:exitCode
