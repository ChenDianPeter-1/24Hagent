import { describe, it, expect } from 'vitest'
import { FakeCommandRunner } from '../src/adapters/shell/command-runner.js'

describe('FakeCommandRunner', () => {
  it('returns preset result on match', async () => {
    const r = new FakeCommandRunner()
    r.preset('npm test', { exitCode: 0, stdout: 'ok', stderr: '' })
    const result = await r.run('npm test')
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('ok')
  })

  it('returns failure result', async () => {
    const r = new FakeCommandRunner()
    r.preset('bad', { exitCode: 1, stdout: '', stderr: 'error' })
    const result = await r.run('bad')
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('error')
  })

  it('throws on unpreset command', async () => {
    const r = new FakeCommandRunner()
    await expect(r.run('unknown')).rejects.toThrow('no preset')
  })

  it('last preset wins for same command', async () => {
    const r = new FakeCommandRunner()
    r.preset('cmd', { exitCode: 0, stdout: 'a', stderr: '' })
    r.preset('cmd', { exitCode: 1, stdout: 'b', stderr: '' })
    expect((await r.run('cmd')).stdout).toBe('b')
  })
})
