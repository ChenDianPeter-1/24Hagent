<#
.SYNOPSIS
    24Hagent setup — one-command install into current project
.DESCRIPTION
    Detects project type (Node/Python), creates .agent workspace + QUALITY_GATES.json,
    copies scripts and protocol docs, runs readiness check. No npm install required.
.PARAMETER SkipReadiness
    Skip the readiness check step.
#>
param([switch]$SkipReadiness)
$ErrorActionPreference = "Stop"

$STARTER_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BIN = Join-Path $STARTER_DIR "bin/24hagent.mjs"

if (-not (Test-Path $BIN)) {
    Write-Host "[ERROR] 24hagent CLI not found: $BIN" -ForegroundColor Red
    Write-Host "Run: npm run build:starter"
    exit 1
}

Write-Host "24Hagent Setup" -ForegroundColor Cyan
Write-Host "=============="

# Step 1: Detect project type (same order as readiness.ts: package.json > pyproject.toml)
$IS_PYTHON = $false
if (Test-Path "package.json") {
    $IS_PYTHON = $false
} elseif (Test-Path "pyproject.toml") {
    $IS_PYTHON = $true
} elseif ((Get-ChildItem -Filter "*.py" -Recurse -Depth 1 | Select-Object -First 1) -or (Test-Path "requirements.txt")) {
    # Python evidence found but no pyproject.toml — create a minimal one
    $IS_PYTHON = $true
    Write-Host "[WARN] Found .py files but no pyproject.toml — creating minimal pyproject.toml" -ForegroundColor Yellow
    @"
[project]
name = "$(Split-Path -Leaf (Get-Location))"
version = "0.1.0"
dependencies = []

[project.optional-dependencies]
dev = ["pytest", "pytest-cov", "ruff", "mypy"]
"@ | Out-File -FilePath "pyproject.toml" -Encoding UTF8
    Write-Host "[OK] pyproject.toml created" -ForegroundColor Green
} else {
    Write-Host "[WARN] No package.json or pyproject.toml found" -ForegroundColor Yellow
}

# Step 2: Create .agent directory
if (-not (Test-Path ".agent")) { New-Item -ItemType Directory -Path ".agent" -Force | Out-Null }

# Step 3: Generate QUALITY_GATES.json (if missing)
$GATES_PATH = ".agent/QUALITY_GATES.json"
if (-not (Test-Path $GATES_PATH)) {
    if ($IS_PYTHON) {
        $gates = @{
            gates = @{
                test      = @{ enabled=$true;  command="pytest";                       blocking=$true; description="Run pytest" }
                lint      = @{ enabled=$true;  command="ruff check .";                  blocking=$true; description="Run ruff linter" }
                typecheck = @{ enabled=$true;  command="mypy src/";                     blocking=$true; description="Run mypy type checker" }
                coverage  = @{ enabled=$true;  command="pytest --cov --cov-report=json"; blocking=$true;
                              threshold=@{lines=100; branches=$null; functions=$null; statements=100}; description="Tests with coverage" }
            }
        }
    } else {
        $gates = @{
            gates = @{
                test      = @{ enabled=$true;  command="npm run test";      blocking=$true; description="Run tests" }
                lint      = @{ enabled=$true;  command="npm run lint";      blocking=$true; description="Run linter" }
                typecheck = @{ enabled=$true;  command="npm run typecheck"; blocking=$true; description="Run type checker" }
                coverage  = @{ enabled=$true;  command="npm run coverage";  blocking=$true;
                              threshold=@{lines=100; branches=100; functions=100; statements=100}; description="Coverage" }
            }
        }
    }
    $json = $gates | ConvertTo-Json -Depth 4
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($GATES_PATH, $json, $utf8NoBom)
    Write-Host "[OK] .agent/QUALITY_GATES.json ($(if ($IS_PYTHON) { 'Python' } else { 'Node' }))" -ForegroundColor Green
} else {
    Write-Host "[SKIP] .agent/QUALITY_GATES.json already exists" -ForegroundColor Yellow
}

# Step 4: Copy scripts and protocol docs from starter to project root
$COPY_LIST = @(
    @{Src="scripts/check_quality_readiness.ps1"; Dst="scripts/check_quality_readiness.ps1"},
    @{Src="scripts/validate_task.ps1";           Dst="scripts/validate_task.ps1"},
    @{Src="scripts/codex_review.ps1";            Dst="scripts/codex_review.ps1"},
    @{Src="CLAUDE_ORCHESTRATOR_PROTOCOL.md";     Dst="CLAUDE_ORCHESTRATOR_PROTOCOL.md"},
    @{Src="START_ORCHESTRATOR.md";               Dst="START_ORCHESTRATOR.md"}
)
foreach ($item in $COPY_LIST) {
    $src = Join-Path $STARTER_DIR $item.Src
    if ((-not (Test-Path $item.Dst)) -and (Test-Path $src)) {
        $parent = Split-Path -Parent $item.Dst
        if ($parent -and -not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        Copy-Item $src $item.Dst
        Write-Host "[OK] $($item.Dst)" -ForegroundColor Green
    }
}

# Step 5: Copy review rubric (if missing)
$RUBRIC_SRC = Join-Path $STARTER_DIR ".agent/CODEX_REVIEW_RUBRIC.md"
$RUBRIC_DST = ".agent/CODEX_REVIEW_RUBRIC.md"
if ((-not (Test-Path $RUBRIC_DST)) -and (Test-Path $RUBRIC_SRC)) {
    Copy-Item $RUBRIC_SRC $RUBRIC_DST
    Write-Host "[OK] .agent/CODEX_REVIEW_RUBRIC.md" -ForegroundColor Green
}

# Step 6: Run readiness check
if (-not $SkipReadiness) {
    Write-Host ""
    Write-Host "Running readiness check..." -ForegroundColor Cyan
    $result = node $BIN readiness 2>&1
    Write-Host $result
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Toolchain not ready. Install missing tools and re-run setup.ps1." -ForegroundColor Yellow
        Write-Host "Then edit .agent/PROJECT_BLUEPRINT.md with your project goals." -ForegroundColor Yellow
        Write-Host "Then copy the prompt from START_ORCHESTRATOR.md into Claude Code." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Done. You can delete the 24hagent-starter/ folder now." -ForegroundColor Green
