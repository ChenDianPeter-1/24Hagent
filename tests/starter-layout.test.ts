import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const starter = resolve(root, 'aegis-starter')
const readStarter = (path: string) => readFileSync(resolve(starter, path), 'utf-8')

describe('Aegis starter layout', () => {
  it('ships the Windows double-click entrypoint and setup scripts', () => {
    expect(existsSync(resolve(starter, 'Start.bat'))).toBe(true)
    expect(existsSync(resolve(starter, 'Start.ps1'))).toBe(true)
    expect(existsSync(resolve(starter, 'setup.ps1'))).toBe(true)
    expect(readStarter('Start.bat')).toContain('Press any key to close this window')
  })

  it('ships the Mac entrypoint and setup scripts', () => {
    expect(existsSync(resolve(starter, 'start.sh'))).toBe(true)
    expect(existsSync(resolve(starter, 'Start.command'))).toBe(true)
    expect(existsSync(resolve(starter, 'setup.sh'))).toBe(true)
    expect(readStarter('start.sh')).toContain('setup.sh')
    expect(readStarter('Start.command')).toContain('start.sh')
  })

  it('installs Claude Code skills under .claude/skills only', () => {
    expect(existsSync(resolve(starter, '.claude/skills/superpower/SKILL.md'))).toBe(true)
    expect(existsSync(resolve(starter, '.claude/skills/superpower/skills/using-superpowers/SKILL.md'))).toBe(true)
    expect(existsSync(resolve(starter, '.claude/skills/aegis-install/SKILL.md'))).toBe(true)
    expect(existsSync(resolve(starter, '.claude/skills/24hagent-install'))).toBe(false)
    expect(existsSync(resolve(starter, '.claude/skills/24hagent-setup'))).toBe(false)
    expect(existsSync(resolve(starter, '.claude/skills/brainstorming'))).toBe(false)
    expect(existsSync(resolve(starter, '.agent'))).toBe(false)
    expect(existsSync(resolve(starter, '.aegis/config/codex-rubric.md'))).toBe(true)
  })

  it('generates an install prompt that routes Claude through aegis-install and Superpower', () => {
    const prompt = readStarter('templates/NEXT_CLAUDE_INSTALL_PROMPT.template.md')
    expect(prompt).toContain('.claude/skills/aegis-install/SKILL.md')
    expect(prompt).toContain('.claude/skills/superpower/')
    expect(prompt).toContain('Start with read-only project intake')
    expect(prompt).toContain('project_type is unknown')
    expect(prompt).toContain('Stop before entering construction')
  })

  it('keeps distributed starter docs and setup output in English', () => {
    const readme = readStarter('README.md')
    const setup = readStarter('setup.ps1')
    expect(readme).toContain('Windows Quick Start')
    expect(readme).toContain('project_type: unknown')
    expect(setup).toContain('Claude CLI was not found on PATH.')
    expect(setup).toContain('Launching Claude Code with the install prompt')
    expect(setup).toContain('PROJECT_TYPE = "unknown"')
    expect(setup).toContain('Readiness check skipped because project type is unknown')
    expect(setup).toContain('.aegis/config/quality-gates.json')
    expect(readme).not.toContain('乱码')
    expect(readme).not.toContain('鈹')
    expect(setup).not.toContain('复制')
  })
})
