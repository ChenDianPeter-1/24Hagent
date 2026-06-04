import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

export type SuperpowerSourceKind = 'repository' | 'guidelines' | 'skill'

export type SuperpowerSource = {
  kind: SuperpowerSourceKind
  name: string
  path: string
  summary: string
}

export type SuperpowerSourceManifest = {
  schema_version: 1
  source_root: string
  generated_at: string
  sources: SuperpowerSource[]
}

const IMPORTANT_SKILLS = [
  'brainstorming',
  'writing-plans',
  'test-driven-development',
  'systematic-debugging',
  'requesting-code-review',
  'verification-before-completion',
  'using-git-worktrees',
  'finishing-a-development-branch'
]

function firstNonEmptyLine(markdown: string): string {
  return markdown.split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? ''
}

function readSummary(path: string, fallback: string): string {
  if (!existsSync(path)) return fallback
  const markdown = readFileSync(path, 'utf-8')
  const description = markdown.match(/^description:\s*"?([^"\r\n]+)"?\s*$/m)?.[1]?.trim()
  if (description) return description
  const first = firstNonEmptyLine(markdown.replace(/^---[\s\S]*?---\s*/, '')).replace(/^#+\s*/, '')
  return first || fallback
}

export function buildSuperpowerSourceManifest(sourceRoot: string, generatedAt: string): SuperpowerSourceManifest {
  const sources: SuperpowerSource[] = []
  const readme = resolve(sourceRoot, 'README.md')
  const claude = resolve(sourceRoot, 'CLAUDE.md')
  const skillsDir = resolve(sourceRoot, 'skills')

  if (existsSync(readme)) {
    sources.push({
      kind: 'repository',
      name: 'Superpowers README',
      path: readme,
      summary: readSummary(readme, 'Superpowers methodology and skills overview.')
    })
  }

  if (existsSync(claude)) {
    sources.push({
      kind: 'guidelines',
      name: 'Superpowers contributor guidelines',
      path: claude,
      summary: readSummary(claude, 'Contributor and agent-quality guidelines.')
    })
  }

  if (existsSync(skillsDir)) {
    for (const skill of IMPORTANT_SKILLS) {
      const skillPath = resolve(skillsDir, skill, 'SKILL.md')
      if (existsSync(skillPath) && statSync(skillPath).isFile()) {
        sources.push({
          kind: 'skill',
          name: skill,
          path: skillPath,
          summary: readSummary(skillPath, `${skill} skill.`)
        })
      }
    }

    const extraSkills = readdirSync(skillsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(name => !IMPORTANT_SKILLS.includes(name))
      .sort()

    for (const skill of extraSkills.slice(0, 12)) {
      const skillPath = resolve(skillsDir, skill, 'SKILL.md')
      if (existsSync(skillPath) && statSync(skillPath).isFile()) {
        sources.push({
          kind: 'skill',
          name: skill,
          path: skillPath,
          summary: readSummary(skillPath, `${skill} skill.`)
        })
      }
    }
  }

  return {
    schema_version: 1,
    source_root: sourceRoot,
    generated_at: generatedAt,
    sources
  }
}

export function renderSuperpowerSummary(manifest: SuperpowerSourceManifest): string {
  const rows = manifest.sources.map(source =>
    `| ${source.kind} | ${source.name} | ${source.summary} | \`${source.path}\` |`
  )

  return [
    '# Superpower Source Summary',
    '',
    `Generated: ${manifest.generated_at}`,
    '',
    `Source root: \`${manifest.source_root}\``,
    '',
    '| Kind | Name | Summary | Path |',
    '|------|------|---------|------|',
    ...rows,
    '',
    '## Aegis Boundary',
    '',
    'Aegis records Superpower file references and discipline expectations. It does not take over, rewrite, or directly invoke Superpowers.',
    ''
  ].join('\n')
}

export type DisciplineCheckResult = {
  verdict: 'PASS' | 'NEED_FIX'
  missingSkills: string[]
  sourceCount: number
  evidence: RoundDisciplineEvidence[]
}

export type DisciplineEvidenceCategory =
  | 'planning'
  | 'tdd'
  | 'debugging'
  | 'verification'
  | 'review'

export type RoundDisciplineEvidence = {
  category: DisciplineEvidenceCategory
  label: string
  path: string
  required: boolean
  present: boolean
  status: 'PASS' | 'OPTIONAL' | 'MISSING' | 'INSUFFICIENT'
  reason: string
  summary: string
  issues: string[]
}

export type DisciplineEvidenceRequirement = {
  category: DisciplineEvidenceCategory
  label: string
  required: boolean
  reason: string
  expectedSignals: string[]
}

const EVIDENCE_FILE_NAMES: Record<DisciplineEvidenceCategory, string> = {
  planning: 'planning-evidence.md',
  tdd: 'tdd-evidence.md',
  debugging: 'debugging-evidence.md',
  verification: 'verification-evidence.md',
  review: 'review-evidence.md'
}

const EVIDENCE_LABELS: Record<DisciplineEvidenceCategory, string> = {
  planning: 'Planning evidence',
  tdd: 'TDD or test-first evidence',
  debugging: 'Systematic debugging evidence',
  verification: 'Verification-before-completion evidence',
  review: 'Review/finishing evidence'
}

const EVIDENCE_SIGNALS: Record<DisciplineEvidenceCategory, RegExp[]> = {
  planning: [
    /\b(plan|planned|scope|scoped|steps?|sequence|approach|decision|task shape)\b/i,
    /\b(acceptance|risk|boundary|file scope|implementation order)\b/i
  ],
  tdd: [
    /\b(test|tests|failing|red|green|assert|coverage|regression test)\b/i,
    /\b(before implementation|before coding|test-first|made .* pass)\b/i
  ],
  debugging: [
    /\b(reproduce|reproduced|root cause|hypothesis|trace|diagnos|debug|failure|failing scenario)\b/i,
    /\b(observed|isolated|regression|fix verified|broken path)\b/i
  ],
  verification: [
    /\b(ran|passed|verified|verification|typecheck|build|lint|test|tests|smoke)\b/i,
    /\b(full validation|focused tests|npm test|diff --check)\b/i
  ],
  review: [
    /\b(review|reviewed|diff|scope|acceptance|codex|verdict|pass|need_fix|need_human)\b/i,
    /\b(changed files|out-of-scope|final check|finishing|commit boundary)\b/i
  ]
}

function taskLooksLikeBugFix(currentTaskMarkdown: string): boolean {
  return /\b(fix|repair|resolve)\s+(?:a|an|the)?\s*(?:bug|regression|defect|failure|failing|broken)\b/i.test(currentTaskMarkdown) ||
    /\b(regression|defect|broken path|failing scenario)\b/i.test(currentTaskMarkdown)
}

function taskLooksLikeFeature(currentTaskMarkdown: string): boolean {
  return /\b(feature|implement|add|introduce|create|build|wire|route|refactor|migrate|update)\b/i.test(currentTaskMarkdown)
}

function requiredEvidenceCategories(currentTaskMarkdown: string): Set<DisciplineEvidenceCategory> {
  const required = new Set<DisciplineEvidenceCategory>(['planning', 'verification', 'review'])
  if (taskLooksLikeBugFix(currentTaskMarkdown)) required.add('debugging')
  if (!taskLooksLikeBugFix(currentTaskMarkdown) || taskLooksLikeFeature(currentTaskMarkdown)) required.add('tdd')
  return required
}

function stripMarkdownNoise(markdown: string): string {
  return markdown
    .replace(/^#.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[[^\]]+\]\([^)]+\)/g, '')
    .trim()
}

function firstEvidenceSummary(markdown: string): string {
  const body = stripMarkdownNoise(markdown)
  const firstLine = body.split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? ''
  return firstLine.length > 140 ? `${firstLine.slice(0, 137)}...` : firstLine
}

function expectedSignals(category: DisciplineEvidenceCategory): string[] {
  switch (category) {
    case 'planning':
      return ['planned scope/steps', 'acceptance/risk/boundary decision']
    case 'tdd':
      return ['test-first or failing-test work', 'tests made to pass']
    case 'debugging':
      return ['reproduction/root-cause work', 'observed failure or regression path']
    case 'verification':
      return ['commands/checks run', 'passing validation result']
    case 'review':
      return ['diff/scope review', 'acceptance or verdict review']
  }
}

function evidenceIssues(markdown: string, category: DisciplineEvidenceCategory): string[] {
  const body = markdown
    .split(/\r?\n/)
    .filter(line => !/^#/.test(line.trim()))
    .join('\n')
    .trim()
  const plainBody = stripMarkdownNoise(markdown)
  const issues: string[] = []

  if (plainBody.length < 40) {
    issues.push('Evidence is too short to prove the discipline was followed.')
  }
  if (/\b(todo|tbd|fill this|coming soon|not yet)\b/i.test(plainBody) || /\bplaceholder\b.*\b(later|todo|tbd|fill)\b/i.test(plainBody)) {
    issues.push('Evidence contains placeholder language.')
  }
  if (!EVIDENCE_SIGNALS[category].some(signal => signal.test(body))) {
    issues.push(`Evidence does not mention expected ${category} signals: ${expectedSignals(category).join('; ')}.`)
  }

  return issues
}

function buildEvidenceRequirement(
  category: DisciplineEvidenceCategory,
  required: boolean
): DisciplineEvidenceRequirement {
  return {
    category,
    label: EVIDENCE_LABELS[category],
    required,
    reason: required
      ? `${EVIDENCE_LABELS[category]} is required for this round.`
      : `${EVIDENCE_LABELS[category]} is optional for this round.`,
    expectedSignals: expectedSignals(category)
  }
}

export function collectRoundDisciplineEvidence(
  currentDir: string,
  currentTaskMarkdown: string
): RoundDisciplineEvidence[] {
  const required = requiredEvidenceCategories(currentTaskMarkdown)
  return (Object.keys(EVIDENCE_FILE_NAMES) as DisciplineEvidenceCategory[]).map((category) => {
    const path = resolve(currentDir, EVIDENCE_FILE_NAMES[category])
    const fileExists = existsSync(path)
    const markdown = fileExists ? readFileSync(path, 'utf-8') : ''
    const issues = fileExists ? evidenceIssues(markdown, category) : ['Evidence file is missing.']
    const requirement = buildEvidenceRequirement(category, required.has(category))
    const present = fileExists && issues.length === 0
    const status = present
      ? 'PASS'
      : requirement.required
        ? fileExists ? 'INSUFFICIENT' : 'MISSING'
        : 'OPTIONAL'
    return {
      category,
      label: requirement.label,
      path,
      required: requirement.required,
      present,
      status,
      reason: requirement.reason,
      summary: fileExists ? firstEvidenceSummary(markdown) : '',
      issues: requirement.required || fileExists ? issues : []
    }
  })
}

export function checkSuperpowerDiscipline(
  manifest: SuperpowerSourceManifest,
  evidence: RoundDisciplineEvidence[]
): DisciplineCheckResult {
  const present = new Set(manifest.sources.filter(source => source.kind === 'skill').map(source => source.name))
  const missingSkills = IMPORTANT_SKILLS.filter(skill => !present.has(skill))
  const missingEvidence = evidence.filter(item => item.required && !item.present)
  return {
    verdict: missingSkills.length === 0 && missingEvidence.length === 0 ? 'PASS' : 'NEED_FIX',
    missingSkills,
    sourceCount: manifest.sources.length,
    evidence
  }
}

export function renderDisciplineReport(result: DisciplineCheckResult, manifest: SuperpowerSourceManifest): string {
  const requiredEvidence = result.evidence.filter(item => item.required)
  const optionalEvidence = result.evidence.filter(item => !item.required)

  return [
    '# Superpower Discipline Report',
    '',
    `Verdict: ${result.verdict}`,
    '',
    `Source count: ${result.sourceCount}`,
    '',
    '## Required Skills',
    '',
    result.missingSkills.length === 0
      ? 'All required Superpower discipline source skills are present.'
      : result.missingSkills.map(skill => `- Missing: ${skill}`).join('\n'),
    '',
    '## Source Evidence',
    '',
    ...manifest.sources
      .filter(source => source.kind === 'skill')
      .map(source => `- ${source.name}: \`${source.path}\``),
    '',
    '## Current Round Discipline Evidence',
    '',
    ...requiredEvidence.map(item =>
      [
        `- ${item.status}: ${item.label} (${item.category}) - \`${item.path}\``,
        `  - Reason: ${item.reason}`,
        item.summary ? `  - Summary: ${item.summary}` : '  - Summary: none',
        item.issues.length > 0 ? `  - Issues: ${item.issues.join(' ')}` : '  - Issues: none'
      ].join('\n')
    ),
    '',
    '## Optional Round Evidence',
    '',
    ...optionalEvidence.map(item =>
      [
        `- ${item.present ? 'PRESENT' : 'not required'}: ${item.label} (${item.category}) - \`${item.path}\``,
        item.summary ? `  - Summary: ${item.summary}` : '  - Summary: none',
        item.issues.length > 0 ? `  - Issues: ${item.issues.join(' ')}` : '  - Issues: none'
      ].join('\n')
    ),
    '',
    '## Boundary',
    '',
    'Superpower source availability proves the discipline materials exist. Current-round evidence proves Claude Code actually followed the required discipline before Codex review.',
    ''
  ].join('\n')
}

export function checkSuperpowerDisciplineSources(manifest: SuperpowerSourceManifest): DisciplineCheckResult {
  return checkSuperpowerDiscipline(manifest, [])
}
