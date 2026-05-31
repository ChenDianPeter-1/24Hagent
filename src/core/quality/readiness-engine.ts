// -- types ------------------------------------------------------------------

export type Verdict = 'READY' | 'NEEDS_CONFIG' | 'BLOCKED'
export type CoverageProfile = 'vitest' | 'coverage_py'

export interface ToolchainInfo {
  testRunner: string | null;   testCommand: string | null;   testEvidence: string
  linter: string | null;       lintCommand: string | null;   lintEvidence: string
  typechecker: string | null;  typecheckCommand: string | null; typecheckEvidence: string
  coverageTool: string | null; coverageCommand: string | null; coverageEvidence: string
  coverageProfile: CoverageProfile | null
  packageManager: string;      projectTypes: string[];        confidence: string
  warnings: string[]
}

export interface GateAudit {
  gate: string; currentCommand: string; suggestedCommand: string; match: string
}

export interface ReadinessResult {
  verdict: Verdict
  toolchain: ToolchainInfo
  audit: GateAudit[]
  blockingIssues: string[]
}

// -- detection ---------------------------------------------------------------

const RUNNERS = /\b(vitest|jest|mocha|ava|tap|tape)\b/
const KNOWN_CMDS = /\b(vitest|jest|mocha|ava|tap|tape|node|python|pytest|go test|cargo test|dotnet test|rspec|unittest)\b/

export function identifyPlaceholder(script: string | undefined): boolean {
  if (!script) return true
  if (script.includes('no test specified')) return true
  if (/\bexit 1\b/.test(script) && !KNOWN_CMDS.test(script)) return true
  if (/^\s*echo\s+/.test(script) && !RUNNERS.test(script)) return true
  return false
}

export function detectToolchain(pkg: { devDependencies?: Record<string,string>; dependencies?: Record<string,string>; scripts?: Record<string,string> }): ToolchainInfo {
  const deps = { ...pkg.devDependencies, ...pkg.dependencies }
  const scripts = pkg.scripts ?? {}
  const warnings: string[] = []

  const hasDep = (name: string) => Object.keys(deps).some(k => k.toLowerCase() === name)

  // test
  const testCmd = scripts.test
  const testPlaceholder = identifyPlaceholder(testCmd)
  const testRunner = hasDep('vitest') ? 'vitest' : hasDep('jest') ? 'jest' : hasDep('mocha') ? 'mocha' : null
  const testEvidence = testRunner ? `${testRunner} in dependencies` : testPlaceholder ? 'placeholder script' : 'unknown'

  // lint
  const hasEslint = hasDep('eslint')
  const linter = hasEslint ? 'eslint' : null
  const lintEvidence = hasEslint ? 'eslint in dependencies' : 'unknown'

  // typecheck
  const hasTsc = hasDep('typescript')
  const typechecker = hasTsc ? 'tsc' : null
  const typecheckEvidence = hasTsc ? 'tsconfig.json exists' : 'unknown'

  // coverage
  const coverageTool = testRunner ? `${testRunner} built-in` : null
  const coverageEvidence = testRunner ? 'vitest --coverage' : 'unknown'

  if (!testRunner && !testPlaceholder) warnings.push('No recognized test runner detected')

  return {
    testRunner, testCommand: testRunner ? 'npm run test' : null, testEvidence,
    linter, lintCommand: hasEslint ? 'npm run lint' : null, lintEvidence,
    typechecker, typecheckCommand: hasTsc ? 'npm run typecheck' : null, typecheckEvidence,
    coverageTool, coverageCommand: testRunner ? 'npm run coverage' : null, coverageEvidence,
    coverageProfile: 'vitest',
    packageManager: 'npm', projectTypes: ['node'], confidence: 'high', warnings
  }
}

// -- Python toolchain detection -----------------------------------------------

/** Minimal TOML dependency + tool-section extractor for pyproject.toml.
 *  Avoids full TOML parse — only needs dependency names and [tool.*] headers. */
function parsePyprojectDeps(toml: string): { deps: Set<string>; toolSections: Set<string> } {
  const deps = new Set<string>()
  const toolSections = new Set<string>()

  // Match array values: dependencies = ["pkg", "pkg>=1"]
  const arrayRe = /(?:dependencies|dev)\s*=\s*\[([\s\S]*?)\]/g
  for (const m of toml.matchAll(arrayRe)) {
    for (const item of m[1].match(/"([^"]+)"/g) ?? []) {
      const name = item.replace(/"/g, '').split(/[><=!~\[\s;]/)[0].trim().toLowerCase()
      if (name && name !== '.' && name !== '..') deps.add(name)
    }
  }

  // PEP 621 inline table: dependencies = ["pkg"] (one-per-line)
  const projectSection = toml.match(/\[project\]([\s\S]*?)(?=\[|$)/)?.[1] ?? ''
  for (const line of projectSection.match(/^\s*"([^"]+)"/gm) ?? []) {
    const name = line.replace(/"/g, '').trim().split(/[><=!~\[\s;]/)[0].trim().toLowerCase()
    if (name && name !== '.' && name !== '..') deps.add(name)
  }

  // Poetry-style: [tool.poetry.dependencies] / [tool.poetry.group.dev.dependencies]
  // Format: pytest = "^8.0" (key = value, not arrays)
  for (const section of toml.matchAll(/\[tool\.poetry\.(?:group\.\w+\.)?dependencies\]([\s\S]*?)(?=\[|$)/g)) {
    for (const line of section[1].match(/^\s*(\w[\w-]*)\s*=/gm) ?? []) {
      deps.add(line.replace(/^\s+/, '').split(/\s*=/)[0].trim().toLowerCase())
    }
  }

  // Detect [tool.xxx] and [tool.xxx.yyy] sections
  for (const m of toml.matchAll(/^\[tool\.(\w+)(?:\.\w+)*\]/gm)) {
    toolSections.add(m[1].toLowerCase())
  }

  return { deps, toolSections }
}

// Python tool mapping: lower-case dep name → tool info
const PY_LINTERS: [string, string, string][] = [
  ['ruff', 'ruff', 'ruff check .'],
  ['pylint', 'pylint', 'pylint src/'],
  ['flake8', 'flake8', 'flake8 src/'],
]
const PY_TYPECHECKERS: [string, string, string][] = [
  ['mypy', 'mypy', 'mypy src/'],
  ['pyright', 'pyright', 'pyright src/'],
]

export function detectPythonToolchain(tomlText: string, packageManager: string): ToolchainInfo {
  const warnings: string[] = []
  const { deps, toolSections } = parsePyprojectDeps(tomlText)

  const hasDep = (name: string) => deps.has(name)
  const hasTool = (name: string) => toolSections.has(name)

  // Test runner
  const hasPytest = hasDep('pytest') || hasDep('pytest-cov') || hasTool('pytest')
  const testRunner = hasPytest ? 'pytest' : null
  const testCommand = hasPytest ? 'pytest' : null
  const testEvidence = hasPytest
    ? (hasDep('pytest') ? 'pytest in dependencies' : 'pytest config found')
    : 'unknown'

  // Linter — first match wins
  let linter: string | null = null; let lintCommand: string | null = null; let lintEvidence = 'unknown'
  for (const [dep, name, cmd] of PY_LINTERS) {
    if (hasDep(dep) || hasTool(dep)) {
      linter = name; lintCommand = cmd
      lintEvidence = hasDep(dep) ? `${dep} in dependencies` : `${dep} config found`
      break
    }
  }

  // Typechecker — first match wins
  let typechecker: string | null = null; let typecheckCommand: string | null = null; let typecheckEvidence = 'unknown'
  for (const [dep, name, cmd] of PY_TYPECHECKERS) {
    if (hasDep(dep) || hasTool(dep)) {
      typechecker = name; typecheckCommand = cmd
      typecheckEvidence = hasDep(dep) ? `${dep} in dependencies` : `${dep} config found`
      break
    }
  }

  // Coverage
  const hasPytestCov = hasDep('pytest-cov')
  const hasCoveragePy = hasDep('coverage')
  const coverageTool = hasPytestCov ? 'pytest-cov' : hasCoveragePy ? 'coverage' : null
  const coverageCommand = hasPytestCov ? 'pytest --cov --cov-report=json' : hasCoveragePy ? 'coverage run -m pytest && coverage json -o -' : null
  const coverageEvidence = coverageTool ? `${coverageTool} in dependencies` : 'unknown'

  if (!testRunner) warnings.push('No recognized Python test runner detected (pytest)')
  if (!linter) warnings.push('No recognized Python linter detected (ruff/pylint/flake8)')

  return {
    testRunner, testCommand, testEvidence,
    linter, lintCommand, lintEvidence,
    typechecker, typecheckCommand, typecheckEvidence,
    coverageTool, coverageCommand, coverageEvidence,
    coverageProfile: 'coverage_py',
    packageManager, projectTypes: ['python'], confidence: hasPytest ? 'high' : 'medium',
    warnings
  }
}

// -- gate audit --------------------------------------------------------------

export function compareGates(tc: ToolchainInfo, gateConfig: Record<string,{command:string;enabled:boolean}>): GateAudit[] {
  const order = ['test','lint','typecheck','coverage']
  const label: Record<string,string> = { test: 'test', lint: 'lint', typecheck: 'typecheck', coverage: 'coverage' }
  const suggest: Record<string,string|null> = {
    test: tc.testCommand, lint: tc.lintCommand, typecheck: tc.typecheckCommand, coverage: tc.coverageCommand
  }
  return order.filter(g => gateConfig[g]?.enabled).map(g => {
    const cur = gateConfig[g].command
    const sug = suggest[g]
    const match = !sug ? 'MISSING_TOOL'
      : cur === sug ? 'MATCH'
      // Only normalize npm test ↔ npm run test (not all npm shortcuts)
      : g === 'test' && (cur === 'npm test' && sug === 'npm run test' || cur === 'npm run test' && sug === 'npm test') ? 'MATCH'
      : 'MISMATCH'
    return { gate: label[g], currentCommand: cur, suggestedCommand: sug ?? '(needs config)', match }
  })
}

// -- verdict -----------------------------------------------------------------

export function classifyReadiness(audit: GateAudit[], tc: ToolchainInfo): ReadinessResult {
  const issues: string[] = []
  const testAudit = audit.find(a => a.gate === 'test')
  const isPython = tc.projectTypes.includes('python')

  if (!tc.testRunner) {
    if (isPython) {
      if (!tc.testCommand) issues.push('No Python test runner detected (pytest). Install: pip install pytest pytest-cov')
    } else {
      if (identifyPlaceholder(tc.testCommand ?? undefined)) {
        issues.push('No real test runner detected (placeholder or missing). Test gate cannot execute.')
      }
    }
  }
  if (!tc.linter) {
    issues.push(isPython
      ? 'No Python linter detected (ruff/pylint/flake8). Install: pip install ruff'
      : 'No linter detected. Lint gate cannot execute.')
  }
  if (!tc.coverageTool) {
    issues.push(isPython
      ? 'No Python coverage tool detected (pytest-cov/coverage). Install: pip install pytest-cov'
      : 'No coverage tool detected. Coverage gate (100% threshold) cannot execute.')
  }
  if (!isPython && testAudit?.match === 'MISSING_TOOL')
    issues.push('package.json test script is an npm default placeholder (contains \'no test specified\' / \'exit 1\'). Replace with a real test command.')

  const hasMismatch = audit.some(a => a.match === 'MISMATCH')
  const verdict = issues.length > 0 ? 'BLOCKED' : hasMismatch ? 'NEEDS_CONFIG' : 'READY'

  return { verdict, toolchain: tc, audit, blockingIssues: issues }
}

// -- report rendering --------------------------------------------------------

export function renderReadinessReport(r: ReadinessResult): string {
  const tc = r.toolchain
  const lines = [
    '# Quality Readiness Report',
    '',
    `Generated: ${new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00')}`,
    '',
    '## Project Detection',
    '',
    '| Property | Value |',
    '|----------|-------|',
    `| Project Types | ${tc.projectTypes.join(', ')} |`,
    `| Package Manager | ${tc.packageManager} |`,
    `| Test Runner | ${tc.testRunner ?? (identifyPlaceholder(tc.testCommand ?? undefined) ? 'placeholder script' : 'unknown')} |`,
    `| Linter | ${tc.linter ?? 'unknown'} |`,
    `| Typechecker | ${tc.typechecker ?? 'unknown'} |`,
    `| Coverage Tool | ${tc.coverageTool ?? 'unknown'} |`,
    `| Detection Confidence | ${tc.confidence} |`,
    '',
    ...(tc.warnings.length > 0 ? ['## Detection Warnings', '', ...tc.warnings.map(w => `- ${w}`), ''] : []),
    '## QUALITY_GATES.json Command Audit',
    '',
    '| Gate | Current Command | Suggested Command | Match |',
    '|------|-----------------|-------------------|-------|',
    ...r.audit.map(a => `| ${a.gate} | \`${a.currentCommand}\` | \`${a.suggestedCommand}\` | ${a.match} |`),
    '',
    '## Coverage Threshold',
    '',
    'Threshold is 100% for lines/branches/functions/statements. This is an MVP hard requirement.',
    'Missing coverage tool does NOT lower the threshold -- it means the project is BLOCKED until tooling is set up.',
    '',
    '## Readiness Verdict',
    '',
    `**${r.verdict}**`,
  ]

  if (r.blockingIssues.length) {
    lines.push('', '## Blocking Issues', '', ...r.blockingIssues.map(i => `- ${i}`))
  }

  const isPython = tc.projectTypes.includes('python')
  lines.push('', '## Next Steps')
  if (r.verdict === 'BLOCKED') {
    if (isPython) {
      lines.push('', '1. Install test runner: pip install pytest pytest-cov',
        '2. Install linter: pip install ruff (or pylint/flake8)',
        '3. Install typechecker: pip install mypy',
        '4. Ensure pyproject.toml declares dev dependencies (pytest, ruff, mypy)',
        '5. Run this script again to verify toolchain',
        '6. Python coverage.py does not track function coverage — set coverage.threshold.functions=null in QUALITY_GATES.json')
    } else {
      lines.push('', '1. Install test runner: npm install --save-dev vitest (or jest)',
        '2. Install linter: npm install --save-dev eslint',
        '3. Add test/lint scripts to package.json',
        '4. Run this script again to verify toolchain',
        '5. If JS-only (no TypeScript), set typecheck gate enabled=false in QUALITY_GATES.json')
    }
  }

  lines.push('', `> Note: QUALITY_GATES.json has NOT been modified.`)
  return lines.join('\n') + '\n'
}

export function computeReadinessExitCode(verdict: Verdict): number {
  return verdict === 'BLOCKED' ? 1 : 0
}
