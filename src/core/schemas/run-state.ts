import { z } from 'zod'

const FixHistoryEntry = z.object({
  attempt: z.number().int().min(1),
  timestamp: z.string().min(1),
  verdict: z.enum(['PASS', 'NEED_FIX', 'NEED_HUMAN']).optional(),
  required_fixes: z.array(z.string()).optional(),
  blocking_issue_ids: z.array(z.string()).optional(),
  reason: z.string().optional()
})

export const RunStateSchema = z.object({
  active_task_id: z.string().nullable(),
  phase: z.string().min(1),
  retry_count: z.number().int().min(0).max(3),
  last_verdict: z.enum(['PASS', 'NEED_FIX', 'NEED_HUMAN']).nullable(),
  consecutive_failures: z.number().int().min(0),
  fix_history: z.array(FixHistoryEntry).default([]),
  updated_at: z.string().nullable()
})

export type RunState = z.infer<typeof RunStateSchema>
export type FixHistoryEntry = z.infer<typeof FixHistoryEntry>

/** Parse a JSON string into a validated RunState. */
export function parseRunStateJson(raw: string): RunState {
  return RunStateSchema.parse(JSON.parse(raw))
}
