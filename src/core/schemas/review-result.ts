import { z } from 'zod'
import { parse as parseYaml } from 'yaml'

// -- sub-schemas -----------------------------------------------------------

const BlockingIssue = z.object({
  id: z.string(),
  severity: z.literal('BLOCKING'),
  issue: z.string(),
  evidence: z.string(),
  required_fix: z.string()
})

const NonBlockingSuggestion = z.object({
  issue: z.string(),
  rationale: z.string()
})

const HumanQuestion = z.object({
  question: z.string(),
  options: z.array(z.string())
})

// -- main schema ------------------------------------------------------------

export const ReviewResultSchema = z.object({
  schemaVersion: z.string().default('1.0'),
  verdict: z.enum(['PASS', 'NEED_FIX', 'NEED_HUMAN']),
  confidence: z.enum(['high', 'medium', 'low']),
  blocking_issues: z.array(BlockingIssue),
  required_fixes: z.array(z.string()),
  non_blocking_suggestions: z.array(NonBlockingSuggestion).default([]),
  human_questions: z.array(HumanQuestion).default([]),
  next_action: z.enum(['continue_next_task', 'fix_current_task', 'ask_human'])
})

export type ReviewResult = z.infer<typeof ReviewResultSchema>

// -- JSONL parser -----------------------------------------------------------

interface JsonlLine {
  type: string
  item?: { type: string; text?: string }
}

/** Extract YAML content from agent text. Handles both fenced (```yaml) and raw forms. */
function extractYamlBlock(text: string): string {
  const fence = text.match(/```ya?ml?\s*\n([\s\S]*?)```/)
  if (fence) return fence[1].trim()

  const m = text.match(/^verdict:\s*(?:PASS|NEED_FIX|NEED_HUMAN)\s*$/m)
  if (!m) throw new Error('No verdict line found in Codex output')
  return text.slice(m.index!).trim()
}

/** Parse raw Codex JSONL into a validated ReviewResult. */
export function parseCodexJsonlToReviewResult(rawJsonl: string): ReviewResult {
  const lines = rawJsonl.trim().split('\n')
  const agentMessages: string[] = []

  for (const line of lines) {
    const d: JsonlLine = JSON.parse(line)
    if (d.item?.type === 'agent_message' && d.item.text) {
      agentMessages.push(d.item.text)
    }
  }

  if (agentMessages.length === 0) {
    throw new Error('No agent_message found in Codex JSONL output')
  }

  // Use the last agent message (final verdict)
  const lastMessage = agentMessages[agentMessages.length - 1]
  const yamlBlock = extractYamlBlock(lastMessage)
  const raw = parseYaml(yamlBlock)

  return ReviewResultSchema.parse(raw)
}

export { BlockingIssue, NonBlockingSuggestion, HumanQuestion }
