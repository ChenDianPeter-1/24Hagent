import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const starter = resolve(root, 'aegis-starter')
const setup = resolve(starter, 'setup.ps1')

describe('Aegis starter setup smoke', () => {
  it.skipIf(process.platform !== 'win32')('initializes .aegis onboarding state without launching Claude', () => {
    const target = mkdtempSync(resolve(tmpdir(), 'aegis-starter-target-'))
    try {
      const output = execFileSync('powershell', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        setup,
        '-ProjectRoot',
        target,
        '-SkipReadiness',
        '-NoClaude'
      ], {
        cwd: root,
        encoding: 'utf-8',
        windowsHide: true
      })

      expect(output).toContain('Aegis Starter')
      expect(output).toContain('Aegis starter setup finished.')
      expect(output).toContain('Claude launch skipped by -NoClaude.')

      expect(existsSync(resolve(target, '.aegis/config/quality-gates.json'))).toBe(true)
      expect(existsSync(resolve(target, '.aegis/config/codex-rubric.md'))).toBe(true)
      expect(existsSync(resolve(target, '.aegis/current/next-claude-install-prompt.md'))).toBe(true)
      expect(existsSync(resolve(target, '.aegis/state/run-state.json'))).toBe(true)
      expect(existsSync(resolve(target, '.claude/skills/aegis-install/SKILL.md'))).toBe(true)
      expect(existsSync(resolve(target, '.claude/skills/superpower/SKILL.md'))).toBe(true)

      expect(existsSync(resolve(target, '.agent'))).toBe(false)
      expect(existsSync(resolve(target, '.claude/skills/24hagent-install'))).toBe(false)

      const gates = JSON.parse(readFileSync(resolve(target, '.aegis/config/quality-gates.json'), 'utf-8'))
      expect(gates.project_type).toBe('unknown')
      expect(gates.gates.test.enabled).toBe(false)

      const state = JSON.parse(readFileSync(resolve(target, '.aegis/state/run-state.json'), 'utf-8'))
      expect(state.phase).toBe('blueprint-draft')
      expect(state.mode).toBe('ask')

      const prompt = readFileSync(resolve(target, '.aegis/current/next-claude-install-prompt.md'), 'utf-8')
      expect(prompt).toContain('.claude/skills/aegis-install/SKILL.md')
      expect(prompt).toContain('Generate only minimal .aegis onboarding files.')
    } finally {
      rmSync(target, { recursive: true, force: true })
    }
  })
})
