/** QUALITY_GATES.json 中单个 gate 的定义 */
export interface GateConfig {
  enabled: boolean
  command: string
  blocking: boolean
  description: string
  threshold?: { lines: number; branches: number; functions: number; statements: number }
}

/** 编排后的单个 gate 执行计划 */
export interface GatePlan {
  name: string
  command: string
  blocking: boolean
  disabled: boolean
}

/** 单个 gate 的执行结果 */
export interface GateResult {
  name: string
  command: string
  exitCode: number | null
  stdout: string
  stderr: string
  status: 'PASS' | 'FAIL' | 'SKIPPED' | 'UNAVAILABLE'
  rawOutput: string  // stdout + stderr 完整原文，不做截断
}

/** vitest JSON summary 解析结果 */
export interface CoverageData {
  lines: number
  branches: number
  functions: number
  statements: number
}

/** 阈值判定结果 */
export interface ThresholdResult {
  metrics: { name: string; actual: number; required: number; pass: boolean }[]
  overall: boolean
}

/** 整体验证结果 */
export interface ValidationVerdict {
  overall: 'PASS' | 'FAIL'
  blockingFailures: string[]
  gateResults: GateResult[]
  coverage: CoverageData | null
  threshold: ThresholdResult | null
}
