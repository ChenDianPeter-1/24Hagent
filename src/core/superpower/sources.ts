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
}

export function checkSuperpowerDisciplineSources(manifest: SuperpowerSourceManifest): DisciplineCheckResult {
  const present = new Set(manifest.sources.filter(source => source.kind === 'skill').map(source => source.name))
  const missingSkills = IMPORTANT_SKILLS.filter(skill => !present.has(skill))
  return {
    verdict: missingSkills.length === 0 ? 'PASS' : 'NEED_FIX',
    missingSkills,
    sourceCount: manifest.sources.length
  }
}

export function renderDisciplineReport(result: DisciplineCheckResult, manifest: SuperpowerSourceManifest): string {
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
    '## Evidence',
    '',
    ...manifest.sources
      .filter(source => source.kind === 'skill')
      .map(source => `- ${source.name}: \`${source.path}\``),
    '',
    '## Boundary',
    '',
    'Aegis uses these sources as evidence and instructions for Claude Code. Aegis must not modify Superpowers or claim it executed a skill without evidence.',
    ''
  ].join('\n')
}
