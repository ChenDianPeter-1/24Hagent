param(
    [string]$ProjectRoot = (Get-Location).Path,
    [switch]$SkipReadiness,
    [switch]$NoClaude
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Skip {
    param([string]$Message)
    Write-Host "[SKIP] $Message" -ForegroundColor Yellow
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Copy-DirectoryFresh {
    param(
        [string]$Source,
        [string]$Destination
    )

    if (-not (Test-Path $Source)) {
        throw "Required starter directory is missing: $Source"
    }

    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }

    Copy-Item -Path (Join-Path $Source "*") -Destination $Destination -Recurse -Force
}

function Write-TextUtf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        $fullPath = $Path
    } else {
        $fullPath = Join-Path (Get-Location).Path $Path
    }

    $parent = Split-Path -Parent $fullPath
    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($fullPath, $Content, $utf8NoBom)
}

function Copy-PromptToClipboard {
    param([string]$Prompt)

    try {
        Set-Clipboard -Value $Prompt
        Write-Ok "Install prompt copied to clipboard."
    } catch {
        Write-Warn "Could not copy the prompt to clipboard. You can open .aegis/current/next-claude-install-prompt.md manually."
    }
}

$STARTER_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BIN = Join-Path $STARTER_DIR "bin/aegis.mjs"
$PROJECT_ROOT_FULL = [System.IO.Path]::GetFullPath($ProjectRoot)

if (-not (Test-Path $BIN)) {
    Write-Host "[ERROR] Aegis CLI was not found: $BIN" -ForegroundColor Red
    Write-Host "Run this in the Aegis repository first: npm run build:starter"
    exit 1
}

Set-Location $PROJECT_ROOT_FULL

Write-Host "Aegis Starter" -ForegroundColor Cyan
Write-Host "============="
Write-Host "Project root: $PROJECT_ROOT_FULL"

Write-Step "1. Detecting project signals"
$signals = @(".git", "package.json", "pyproject.toml", "requirements.txt", "src", "tests")
foreach ($signal in $signals) {
    if (Test-Path $signal) {
        Write-Ok "Found $signal"
    }
}

$PROJECT_TYPE = "unknown"
if (Test-Path "package.json") {
    $PROJECT_TYPE = "node"
    Write-Ok "Detected Node.js project."
} elseif (Test-Path "pyproject.toml") {
    $PROJECT_TYPE = "python"
    Write-Ok "Detected Python project."
} elseif ((Get-ChildItem -Filter "*.py" -Recurse -Depth 1 -ErrorAction SilentlyContinue | Select-Object -First 1) -or (Test-Path "requirements.txt")) {
    $PROJECT_TYPE = "python"
    Write-Warn "Found Python evidence but no pyproject.toml. Creating a minimal pyproject.toml."
    $projectName = Split-Path -Leaf $PROJECT_ROOT_FULL
    Write-TextUtf8NoBom "pyproject.toml" @"
[project]
name = "$projectName"
version = "0.1.0"
dependencies = []

[project.optional-dependencies]
dev = ["pytest", "pytest-cov", "ruff", "mypy"]
"@
    Write-Ok "pyproject.toml created."
} else {
    Write-Warn "No package.json, pyproject.toml, requirements.txt, or shallow Python files were found."
    Write-Warn "Project type is unknown. Aegis will defer stack selection to Claude onboarding."
}

Write-Step "2. Creating runtime directories"
New-Item -ItemType Directory -Path ".aegis/config" -Force | Out-Null
New-Item -ItemType Directory -Path ".aegis/blueprint" -Force | Out-Null
New-Item -ItemType Directory -Path ".aegis/current" -Force | Out-Null
New-Item -ItemType Directory -Path ".aegis/state" -Force | Out-Null
New-Item -ItemType Directory -Path ".claude/skills" -Force | Out-Null
Write-Ok ".aegis/"
Write-Ok ".claude/skills/"

Write-Step "3. Installing Claude Code skills"
$superpowerSrc = Join-Path $STARTER_DIR ".claude/skills/superpower"
$superpowerDst = ".claude/skills/superpower"
Copy-DirectoryFresh $superpowerSrc $superpowerDst
Write-Ok ".claude/skills/superpower/"

$installSkillSrc = Join-Path $STARTER_DIR ".claude/skills/aegis-install"
$installSkillDst = ".claude/skills/aegis-install"
Copy-DirectoryFresh $installSkillSrc $installSkillDst
Write-Ok ".claude/skills/aegis-install/"

Write-Step "4. Creating quality gates"
$GATES_PATH = ".aegis/config/quality-gates.json"
if (-not (Test-Path $GATES_PATH)) {
    if ($PROJECT_TYPE -eq "python") {
        $gates = @{
            project_type = "python"
            tdd_required = $true
            gates = @{
                test      = @{ enabled=$true;  command="pytest";                        blocking=$true; description="Run pytest" }
                lint      = @{ enabled=$true;  command="ruff check .";                 blocking=$true; description="Run ruff linter" }
                typecheck = @{ enabled=$true;  command="mypy src/";                    blocking=$true; description="Run mypy type checker" }
                coverage  = @{ enabled=$true;  command="pytest --cov --cov-report=json"; blocking=$true; threshold=@{lines=100; branches=$null; functions=$null; statements=100}; description="Tests with coverage" }
            }
        }
    } elseif ($PROJECT_TYPE -eq "node") {
        $gates = @{
            project_type = "node"
            tdd_required = $true
            gates = @{
                test      = @{ enabled=$true; command="npm run test";      blocking=$true; description="Run tests" }
                lint      = @{ enabled=$true; command="npm run lint";      blocking=$true; description="Run linter" }
                typecheck = @{ enabled=$true; command="npm run typecheck"; blocking=$true; description="Run type checker" }
                coverage  = @{ enabled=$true; command="npm run coverage";  blocking=$true; threshold=@{lines=100; branches=100; functions=100; statements=100}; description="Coverage" }
            }
        }
    } else {
        $needsConfig = "NEEDS_CONFIG: clarify project stack first during Claude onboarding"
        $gates = @{
            project_type = "unknown"
            tdd_required = $true
            gates = @{
                test      = @{ enabled=$false; command=""; blocking=$true; description=$needsConfig }
                lint      = @{ enabled=$false; command=""; blocking=$true; description=$needsConfig }
                typecheck = @{ enabled=$false; command=""; blocking=$true; description=$needsConfig }
                coverage  = @{ enabled=$false; command=""; blocking=$true; threshold=@{lines=100; branches=100; functions=100; statements=100}; description=$needsConfig }
            }
        }
    }
    Write-TextUtf8NoBom $GATES_PATH ($gates | ConvertTo-Json -Depth 5)
    Write-Ok ".aegis/config/quality-gates.json created."
} else {
    Write-Skip ".aegis/config/quality-gates.json already exists."
}

Write-Step "5. Copying Aegis runtime helpers"
$COPY_LIST = @(
    @{Src="scripts/check_quality_readiness.ps1"; Dst="scripts/check_quality_readiness.ps1"},
    @{Src="scripts/validate_task.ps1";           Dst="scripts/validate_task.ps1"},
    @{Src="scripts/codex_review.ps1";            Dst="scripts/codex_review.ps1"}
)
foreach ($item in $COPY_LIST) {
    $src = Join-Path $STARTER_DIR $item.Src
    if ((-not (Test-Path $item.Dst)) -and (Test-Path $src)) {
        $parent = Split-Path -Parent $item.Dst
        if ($parent -and -not (Test-Path $parent)) {
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
        }
        Copy-Item $src $item.Dst
        Write-Ok $item.Dst
    } elseif (Test-Path $item.Dst) {
        Write-Skip "$($item.Dst) already exists."
    }
}

$RUBRIC_SRC = Join-Path $STARTER_DIR ".aegis/config/codex-rubric.md"
$RUBRIC_DST = ".aegis/config/codex-rubric.md"
if ((-not (Test-Path $RUBRIC_DST)) -and (Test-Path $RUBRIC_SRC)) {
    Copy-Item $RUBRIC_SRC $RUBRIC_DST
    Write-Ok ".aegis/config/codex-rubric.md"
} elseif (Test-Path $RUBRIC_DST) {
    Write-Skip ".aegis/config/codex-rubric.md already exists."
}

$STATE_PATH = ".aegis/state/run-state.json"
if (-not (Test-Path $STATE_PATH)) {
    $runState = @{
        schema_version = 1
        project_id = (Split-Path -Leaf $PROJECT_ROOT_FULL)
        task_id = "starter-onboarding"
        phase = "blueprint-draft"
        mode = "ask"
        last_verdict = "starter-installed"
        round_count = 0
        retry_count = 0
        updated_at = (Get-Date).ToString("s")
    }
    Write-TextUtf8NoBom $STATE_PATH ($runState | ConvertTo-Json -Depth 5)
    Write-Ok ".aegis/state/run-state.json created."
} else {
    Write-Skip ".aegis/state/run-state.json already exists."
}

Write-Step "6. Generating Claude install prompt"
$promptTemplate = Join-Path $STARTER_DIR "templates/NEXT_CLAUDE_INSTALL_PROMPT.template.md"
if (Test-Path $promptTemplate) {
    $prompt = [System.IO.File]::ReadAllText($promptTemplate)
} else {
    $prompt = @"
# Aegis Install Onboarding

You are now inside a project where Aegis Starter has completed local setup.

Please read and strictly follow:

.claude/skills/aegis-install/SKILL.md

Important rules:
- Start with read-only project intake.
- Do not modify business code during intake.
- Use the bundled Superpower Pack at .claude/skills/superpower/.
- Generate only minimal .aegis onboarding files.
- Stop before entering construction unless the user confirms.
"@
}
Write-TextUtf8NoBom ".aegis/current/next-claude-install-prompt.md" $prompt
Write-Ok ".aegis/current/next-claude-install-prompt.md"
Copy-PromptToClipboard $prompt

Write-Step "7. Running readiness check"
if ($PROJECT_TYPE -eq "unknown") {
    Write-Skip "Readiness check skipped because project type is unknown. Claude onboarding will clarify the stack first."
} elseif (-not $SkipReadiness) {
    $oldErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $result = & node $BIN readiness 2>&1
    $readinessExitCode = $LASTEXITCODE
    $ErrorActionPreference = $oldErrorActionPreference
    Write-Host $result
    if ($readinessExitCode -ne 0) {
        Write-Warn "Readiness found blocking issues. Fix the reported toolchain gaps before starting the Aegis delivery loop."
    }
} else {
    Write-Skip "Readiness check skipped."
}

Write-Step "8. Starting Claude Code"
if ($NoClaude) {
    Write-Skip "Claude launch skipped by -NoClaude."
} else {
    $claude = Get-Command claude -ErrorAction SilentlyContinue
    if ($claude) {
        Write-Ok "Claude CLI found."
        $claudeHelp = ""
        try {
            $claudeHelp = (& $claude.Source --help 2>&1 | Out-String)
        } catch {
            $claudeHelp = ""
        }

        if ($claudeHelp -match "\[prompt\]" -or $claudeHelp -match "Arguments:\s*prompt") {
            Write-Host "Launching Claude Code with the install prompt from the project root."
            & $claude.Source $prompt
        } else {
            Write-Host "Launching Claude Code from the project root."
            Write-Host "Your Claude CLI does not advertise prompt injection. Paste the prompt already copied to your clipboard."
            & $claude.Source
        }
    } else {
        Write-Warn "Claude CLI was not found on PATH."
        Write-Host ""
        Write-Host "Aegis setup is complete."
        Write-Host "The install prompt has been copied to your clipboard."
        Write-Host ""
        Write-Host "Next steps:"
        Write-Host "1. Open Claude Code in this project directory."
        Write-Host "2. Paste the prompt from .aegis/current/next-claude-install-prompt.md."
        Write-Host "3. Claude will read .claude/skills/aegis-install/SKILL.md."
        Write-Host "4. The install skill will use .claude/skills/superpower/ for project onboarding."
    }
}

Write-Host ""
Write-Host "Aegis starter setup finished." -ForegroundColor Green
