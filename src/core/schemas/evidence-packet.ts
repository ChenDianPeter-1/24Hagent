import { z } from 'zod'

export const EvidencePacketSchema = z.object({
  task_id: z.string().min(1),
  timestamp: z.string().min(1),
  work_report_path: z.string().min(1),
  validation_report_path: z.string().min(1),
  git_diff: z.string()
})

export type EvidencePacket = z.infer<typeof EvidencePacketSchema>

export function createEvidencePacketManifest(
  taskId: string, workReportPath: string, validationReportPath: string, diff: string
): EvidencePacket {
  return EvidencePacketSchema.parse({
    task_id: taskId,
    timestamp: new Date().toISOString(),
    work_report_path: workReportPath,
    validation_report_path: validationReportPath,
    git_diff: diff
  })
}
