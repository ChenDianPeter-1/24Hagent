import { readFileSync } from 'node:fs'
import { getAegisRuntimePaths } from '../core/aegis-runtime/index.js'

export function runContract(root: string): void {
  const paths = getAegisRuntimePaths(root)
  console.log(readFileSync(paths.claudeCodeContract, 'utf-8'))
}
