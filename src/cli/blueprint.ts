import { getAegisRuntimePaths } from '../core/aegis-runtime/index.js'
import {
  confirmBlueprintFlow,
  startBlueprintFlow,
  summarizeBlueprintFlow
} from '../core/aegis-runtime/index.js'

export function runBlueprintStart(root: string): void {
  console.log(startBlueprintFlow(getAegisRuntimePaths(root)))
}

export function runBlueprintSummary(root: string): void {
  console.log(summarizeBlueprintFlow(getAegisRuntimePaths(root)))
}

export function runBlueprintConfirm(root: string): void {
  console.log(confirmBlueprintFlow(getAegisRuntimePaths(root)))
}
