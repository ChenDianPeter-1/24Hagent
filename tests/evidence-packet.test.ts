import { describe, it, expect } from 'vitest'
import { createEvidencePacketManifest, EvidencePacketSchema } from '../src/core/schemas/evidence-packet.js'

describe('EvidencePacket', () => {
  it('creates a valid manifest', () => {
    const p = createEvidencePacketManifest(
      'T-001', '.agent/WORK_REPORT.md', '.agent/VALIDATION_REPORT.md', 'diff --git'
    )
    expect(p.task_id).toBe('T-001')
    expect(p.git_diff).toBe('diff --git')
    expect(p.timestamp).toContain('T')
  })

  it('stamps ISO timestamp automatically', () => {
    const p = createEvidencePacketManifest('x', 'a', 'b', '')
    expect(new Date(p.timestamp).toISOString()).toBe(p.timestamp)
  })

  it('rejects empty task_id', () => {
    expect(() =>
      EvidencePacketSchema.parse({ task_id: '', timestamp: 't', work_report_path: 'a', validation_report_path: 'b', git_diff: '' })
    ).toThrow()
  })

  it('rejects empty work_report_path', () => {
    expect(() =>
      EvidencePacketSchema.parse({ task_id: 'x', timestamp: 't', work_report_path: '', validation_report_path: 'b', git_diff: '' })
    ).toThrow()
  })
})
