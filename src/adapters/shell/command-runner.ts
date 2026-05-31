import { exec } from 'node:child_process'

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export interface RunOptions {
  cwd?: string
  timeoutMs?: number
}

export interface CommandRunner {
  run(command: string, opts?: RunOptions): Promise<CommandResult>
}

/** Pure: classify exec error. Returns exitCode for command failures, throws for operational errors. */
export function classifyExecError(error: { code?: number | string | null; killed?: boolean; message?: string }, command: string): never | number {
  if (error.killed) throw new Error(`Command timed out: ${command}`)
  if (typeof error.code === 'number') return error.code
  throw new Error(`${error.code ?? 'SPAWN_ERROR'}: ${error.message}`)
}

export class FakeCommandRunner implements CommandRunner {
  private results = new Map<string, CommandResult>()

  preset(command: string, result: CommandResult): void {
    this.results.set(command, result)
  }

  async run(command: string, _opts?: RunOptions): Promise<CommandResult> {
    const result = this.results.get(command)
    if (!result) throw new Error(`FakeCommandRunner: no preset for "${command}"`)
    return result
  }
}

export class RealCommandRunner implements CommandRunner {
  async run(command: string, opts?: RunOptions): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      exec(command, {
        cwd: opts?.cwd,
        timeout: opts?.timeoutMs,
        maxBuffer: 10 * 1024 * 1024
      }, (error: { code?: number | string | null; killed?: boolean; message?: string } | null, stdout: string, stderr: string) => {
        if (!error) { resolve({ exitCode: 0, stdout, stderr }); return }
        try {
          resolve({ exitCode: classifyExecError(error, command), stdout, stderr })
        } catch (e) { reject(e) }
      })
    })
  }
}
