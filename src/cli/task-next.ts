import {
  generateNextCurrentTask,
  getAegisRuntimePaths
} from '../core/aegis-runtime/index.js'

export function runTaskNext(root: string): void {
  console.log(generateNextCurrentTask(getAegisRuntimePaths(root)))
}
