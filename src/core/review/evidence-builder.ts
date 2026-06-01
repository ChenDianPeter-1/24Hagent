import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { parseCurrentTaskMarkdown, type TaskPackage } from '../schemas/task-package.js'

export interface ReviewEvidence {
  task: TaskPackage
  workReport: string
  validationReport: string
  rubric: string
  changedFiles: string[]
  scopedDiff: string
}

export interface ReviewEvidenceOptions {
  maxChangedFiles?: number
  maxDiffLines?: number
}

function readIfExists(root: string, path: string): string {
  const fullPath = resolve(root, path)
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf-8') : ''
}

function runGit(root: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 10
  })
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/\/+$/, '')
}

function isInScope(file: string, scope: string[]): boolean {
  const normalizedFile = normalizePath(file)
  return scope.some(rawScope => {
    const normalizedScope = normalizePath(rawScope)
    return normalizedFile === normalizedScope || normalizedFile.startsWith(`${normalizedScope}/`)
  })
}

function countDiffLines(diff: string): number {
  return diff ? diff.split(/\r?\n/).length : 0
}

function listChangedFiles(root: string): string[] {
  const tracked = runGit(root, ['diff', '--name-only', 'HEAD'])
  const untracked = runGit(root, ['ls-files', '--others', '--exclude-standard'])
  return [...tracked.split(/\r?\n/), ...untracked.split(/\r?\n/)]
    .map(normalizePath)
    .filter(Boolean)
}

export function buildReviewEvidence(root: string, options: ReviewEvidenceOptions = {}): ReviewEvidence {
  const maxChangedFiles = options.maxChangedFiles ?? 20
  const maxDiffLines = options.maxDiffLines ?? 1000
  const taskMd = readFileSync(resolve(root, '.agent/CURRENT_TASK.md'), 'utf-8')
  const task = parseCurrentTaskMarkdown(taskMd)
  const fileScope = task.file_scope.map(normalizePath)
  const changedFiles = listChangedFiles(root)

  const outOfScopeFiles = changedFiles.filter(file => !isInScope(file, fileScope))
  if (outOfScopeFiles.length > 0) {
    throw new Error([
      'review blocked: changed files outside current task file_scope',
      ...outOfScopeFiles.map(file => `- ${file}`)
    ].join('\n'))
  }

  if (changedFiles.length > maxChangedFiles) {
    throw new Error(`review blocked: changed files count ${changedFiles.length} exceeds limit ${maxChangedFiles}`)
  }

  const scopedDiff = runGit(root, ['diff', 'HEAD', '--', ...fileScope])
  const diffLines = countDiffLines(scopedDiff)
  if (diffLines > maxDiffLines) {
    throw new Error(`review blocked: scoped diff has ${diffLines} lines, exceeds limit ${maxDiffLines}`)
  }

  return {
    task,
    workReport: readIfExists(root, '.agent/WORK_REPORT.md'),
    validationReport: readIfExists(root, '.agent/VALIDATION_REPORT.md'),
    rubric: readIfExists(root, '.agent/CODEX_REVIEW_RUBRIC.md'),
    changedFiles,
    scopedDiff
  }
}
