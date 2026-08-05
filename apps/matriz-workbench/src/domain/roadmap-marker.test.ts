import { describe, expect, it } from "vitest"
import { assertRoadmapMarkerStatusChange, markerHasReviewableEvidence } from "./roadmap-marker"
import { roadmapMarkerSchema, workItemV2Schema } from "./schemas"

const phaseId = "phase_11111111-1111-4111-8111-111111111111"
const marker = roadmapMarkerSchema.parse({
  id: "marker_22222222-2222-4222-8222-222222222222", phaseId, kind: "validation_gate", status: "pending_review",
  title: "Validar experiência", description: "", targetDate: "2026-08-10", backlogIds: [], references: [],
})

describe("roadmap marker policy", () => {
  it("rejects gate approval by an agent or without evidence", () => {
    expect(() => assertRoadmapMarkerStatusChange(marker, "passed", { actor: "codex", evidenceAvailable: true, reviewedBy: "Tai" })).toThrow(/humano/)
    expect(() => assertRoadmapMarkerStatusChange(marker, "passed", { actor: "human", evidenceAvailable: false, reviewedBy: "Tai" })).toThrow(/evidência/)
  })

  it("requires a reason to waive and allows a human waiver with reason", () => {
    expect(() => assertRoadmapMarkerStatusChange(marker, "waived", { actor: "human", evidenceAvailable: false })).toThrow(/justificativa/)
    expect(() => assertRoadmapMarkerStatusChange(marker, "waived", { actor: "human", evidenceAvailable: false, waiverReason: "Risco aceito" })).not.toThrow()
  })

  it("derives evidence from a completed linked item, but not from status alone", () => {
    const item = workItemV2Schema.parse({
      schemaVersion: 2, id: "wi_33333333-3333-4333-8333-333333333333", projectId: "sample", kind: "task", title: "Teste",
      description: "", productStatus: "completed", validationStatus: "not_required", humanReviewStatus: "not_required", documentationStatus: "not_required",
      priority: "medium", workScope: { kind: "project" }, tags: [], acceptanceCriteria: [], dependencies: [], references: [], blockers: [], createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z", revision: "revision1",
    })
    expect(markerHasReviewableEvidence({ ...marker, backlogIds: [item.id] }, [item])).toBe(false)
    expect(markerHasReviewableEvidence({ ...marker, backlogIds: [item.id] }, [{ ...item, references: [{ kind: "repository_file", path: "README.md" }] }])).toBe(true)
  })
})
