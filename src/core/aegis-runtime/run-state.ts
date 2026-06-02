import { z } from 'zod'

export const AegisPhaseSchema = z.enum([
  'uninitialized',
  'blueprint-draft',
  'blueprint-confirmation',
  'blueprint-revision',
  'ready-for-task',
  'task-ready',
  'waiting-for-construction',
  'validating',
  'discipline-check',
  'codex-review',
  'need-fix',
  'passed',
  'paused',
  'blocked',
  'hard-blocked',
  'decision-request',
  'human-handoff',
  'archived'
])

export const AegisModeSchema = z.enum(['auto', 'allow', 'ask'])
export const AegisVerdictSchema = z.enum(['PASS', 'NEED_FIX', 'NEED_HUMAN'])

export const AegisRunStateSchema = z.object({
  schema_version: z.literal(1),
  project_id: z.string().min(1),
  task_id: z.string().min(1).nullable(),
  phase: AegisPhaseSchema,
  mode: AegisModeSchema,
  last_verdict: z.union([AegisVerdictSchema, z.string().min(1)]).nullable().default(null),
  retry_count: z.number().int().min(0).max(10),
  updated_at: z.string().min(1)
})

export type AegisPhase = z.infer<typeof AegisPhaseSchema>
export type AegisMode = z.infer<typeof AegisModeSchema>
export type AegisRunState = z.infer<typeof AegisRunStateSchema>

export function parseAegisRunStateJson(raw: string): AegisRunState {
  return AegisRunStateSchema.parse(JSON.parse(raw))
}

export function stringifyAegisRunState(state: AegisRunState): string {
  return `${JSON.stringify(state, null, 2)}\n`
}

export function isAegisStopPhase(phase: AegisPhase): boolean {
  return [
    'paused',
    'blocked',
    'hard-blocked',
    'decision-request',
    'human-handoff',
    'waiting-for-construction'
  ].includes(phase)
}
