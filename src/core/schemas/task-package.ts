import { z } from 'zod'

const DoDItem = z.object({
  content: z.string(),
  checked: z.boolean()
})

export const TaskPackageSchema = z.object({
  task_id: z.string().min(1),
  title: z.string().min(1),
  specification: z.string().min(1),
  file_scope: z.array(z.string()).min(1),
  definition_of_done: z.array(DoDItem).min(1),
  acceptance_checks: z.string().min(1),
  stop_rule: z.string().min(1)
})

export type TaskPackage = z.infer<typeof TaskPackageSchema>

// -- Markdown parser --------------------------------------------------------

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Extract content under a ## heading. Stops at next ## heading or end. */
function section(md: string, heading: string): string {
  const re = new RegExp(`## ${escapeRe(heading)}\\s*\\n+([\\s\\S]*?)(?=\\n## |$)`)
  const m = md.match(re)
  return (m?.[1] ?? '').trim()
}

function parseBulletList(text: string): string[] {
  if (!text) return []
  return text.split('\n')
    .map(l => l.replace(/^-\s*/, '').trim())
    .filter(Boolean)
}

function parseDoDList(text: string): { content: string; checked: boolean }[] {
  if (!text) return []
  return text.split('\n')
    .map(l => l.match(/^-\s*\[([ x])\]\s*(.+)/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map(m => ({ content: m[2].trim(), checked: m[1] === 'x' }))
}

function extractAcceptanceChecks(text: string): string {
  const m = text.match(/```[\s\S]*?\n([\s\S]*?)```/)
  return m ? m[1].trim() : text.trim()
}

export function parseCurrentTaskMarkdown(rawMd: string): TaskPackage {
  return TaskPackageSchema.parse({
    task_id: section(rawMd, 'Task ID'),
    title: section(rawMd, 'Title'),
    specification: section(rawMd, 'Specification'),
    file_scope: parseBulletList(section(rawMd, 'File Scope')),
    definition_of_done: parseDoDList(section(rawMd, 'Definition of DoD')),
    acceptance_checks: extractAcceptanceChecks(section(rawMd, 'Acceptance Checks')),
    stop_rule: section(rawMd, 'Stop Rule')
  })
}

export { DoDItem }
