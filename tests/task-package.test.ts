import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseCurrentTaskMarkdown } from '../src/core/schemas/task-package.js'

const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname!, 'fixtures', name), 'utf-8')

describe('parseCurrentTaskMarkdown', () => {
  it('parses a real B1-1 task', () => {
    const t = parseCurrentTaskMarkdown(fixture('current-task-b1-1.md'))
    expect(t.task_id).toBe('B1-1-ts-toolchain')
    expect(t.title).toContain('TypeScript')
    expect(t.specification.length).toBeGreaterThan(50)
    expect(t.file_scope).toContain('package.json')
    expect(t.file_scope).toContain('tsconfig.json')
    expect(t.definition_of_done.length).toBeGreaterThan(0)
    expect(t.definition_of_done[0]).toHaveProperty('checked')
    expect(t.acceptance_checks).toContain('check_quality_readiness.ps1')
    expect(t.acceptance_checks).toContain('npm test && npm run typecheck && npm run lint')
    expect(t.stop_rule).toContain('HUMAN_HANDOFF')
  })

  it('parses a minimal valid task', () => {
    const t = parseCurrentTaskMarkdown(fixture('current-task-minimal.md'))
    expect(t.task_id).toBe('T-001-test')
    expect(t.file_scope).toEqual(['src/foo.ts'])
    expect(t.definition_of_done).toEqual([
      { content: 'thing works', checked: false }
    ])
  })

  it('throws on task missing all required fields', () => {
    expect(() =>
      parseCurrentTaskMarkdown(fixture('current-task-empty.md'))
    ).toThrow()
  })

  it('extracts plain text acceptance checks', () => {
    const md = `# Current Task

## Task ID
T-003

## Title
Plain checks

## Specification
No code fence.

## File Scope
- b.ts

## Definition of DoD
- [ ] ok

## Acceptance Checks
just run npm test

## Stop Rule
stop
`
    const t = parseCurrentTaskMarkdown(md)
    expect(t.acceptance_checks).toBe('just run npm test')
  })

  it('handles checked and unchecked DoD items', () => {
    const md = `# Current Task

## Task ID
T-002

## Title
DoD test

## Specification
Testing checkboxes.

## File Scope
- a.ts

## Definition of DoD
- [x] already done
- [ ] still pending
- [x] also done

## Acceptance Checks
echo ok

## Stop Rule
never
`
    const t = parseCurrentTaskMarkdown(md)
    expect(t.definition_of_done).toEqual([
      { content: 'already done', checked: true },
      { content: 'still pending', checked: false },
      { content: 'also done', checked: true }
    ])
  })
})
