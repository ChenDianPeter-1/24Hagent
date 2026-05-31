export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export interface CommandRunner {
  run(command: string): Promise<CommandResult>
}

export class FakeCommandRunner implements CommandRunner {
  private results = new Map<string, CommandResult>()

  preset(command: string, result: CommandResult): void {
    this.results.set(command, result)
  }

  async run(command: string): Promise<CommandResult> {
    const result = this.results.get(command)
    if (!result) throw new Error(`FakeCommandRunner: no preset for "${command}"`)
    return result
  }
}
