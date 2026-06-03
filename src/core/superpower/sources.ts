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
  reason: string
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

function taskLooksLikeBugFix(currentTaskMarkdown: string): boolean {
  return /\b(bug|bugfix|fix|regression|debug|defect|failure|failing|broken)\b/i.test(currentTaskMarkdown)
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

function hasMeaningfulEvidence(markdown: string): boolean {
  const body = markdown
    .replace(/^#.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim()
  return body.length >= 20 && !/\b(todo|tbd|placeholder)\b/i.test(body)
}

export function collectRoundDisciplineEvidence(
  currentDir: string,
  currentTaskMarkdown: string
): RoundDisciplineEvidence[] {
  const required = requiredEvidenceCategories(currentTaskMarkdown)
  return (Object.keys(EVIDENCE_FILE_NAMES) as DisciplineEvidenceCategory[]).map((category) => {
    const path = resolve(currentDir, EVIDENCE_FILE_NAMES[category])
    const fileExists = existsSync(path)
    const present = fileExists && hasMeaningfulEvidence(readFileSync(path, 'utf-8'))
    return {
      category,
      label: EVIDENCE_LABELS[category],
      path,
      required: required.has(category),
      present,
      reason: required.has(category)
        ? `${EVIDENCE_LABELS[category]} is required for this round.`
        : `${EVIDENCE_LABELS[category]} is optional for this round.`
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
      `- ${item.present ? 'PASS' : 'MISSING'}: ${item.label} (${item.category}) - \`${item.path}\``
    ),
    '',
    '## Optional Round Evidence',
    '',
    ...optionalEvidence.map(item =>
      `- ${item.present ? 'PRESENT' : 'not required'}: ${item.label} (${item.category}) - \`${item.path}\``
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
