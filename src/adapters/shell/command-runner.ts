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
      }, (error, stdout, stderr) => {
        if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error(`Command not found: ${command.split(' ')[0]}`))
        } else if (error?.killed) {
          reject(new Error(`Command timed out: ${command}`))
        } else {
          resolve({ exitCode: typeof error?.code === 'number' ? error.code : 0, stdout, stderr })
        }
      })
    })
  }
}
