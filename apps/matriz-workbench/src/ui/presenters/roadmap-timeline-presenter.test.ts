import { describe, expect, it } from "vitest"
import { roadmapSchema, workItemV2Schema } from "../../domain/schemas"
import { toRoadmapInspectorViewModel, toRoadmapMarkerInspectorViewModel, toRoadmapTimelineViewModel } from "./roadmap-timeline-presenter"

describe("roadmap timeline presenter", () => {
  it("maps dated and undated initiatives without inventing dates", () => {
    const roadmap = roadmapSchema.parse({
      schemaVersion: 1,
      projectId: "sample",
      phases: [{
        id: "phase_00000000-0000-4000-8000-000000000000",
        title: "Plataforma",
        outcome: "Planejamento verificável.",
        status: "active",
        initiatives: [
          {
            id: "ini_00000000-0000-4000-8000-000000000001",
            title: "Timeline",
            outcome: "Período visível.",
            status: "active",
            startDate: "2026-08-01",
            targetDate: "2026-09-30",
            backlogIds: ["wi_00000000-0000-4000-8000-000000000002"],
          },
          {
            id: "ini_00000000-0000-4000-8000-000000000003",
            title: "Sem data",
            outcome: "Ainda não planejada.",
            status: "planned",
            backlogIds: [],
          },
        ],
      }],
      goals: [],
      scorecards: [],
      updatedAt: "2026-08-01T00:00:00.000Z",
      revision: "revision-1",
    })
    const workItem = workItemV2Schema.parse({
      schemaVersion: 2,
      id: "wi_00000000-0000-4000-8000-000000000002",
      projectId: "sample",
      kind: "feature",
      title: "Roadmap temporal",
      description: "",
      productStatus: "completed",
      validationStatus: "passed",
      humanReviewStatus: "approved",
      documentationStatus: "current",
      priority: "high",
      workScope: { kind: "project" },
      tags: [],
      acceptanceCriteria: [],
      dependencyIds: [],
      references: [{ kind: "external_url", url: "https://example.com/evidence" }],
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      revision: "revision-2",
    })

    const timeline = toRoadmapTimelineViewModel(roadmap, [workItem], "2026-08-15")
    expect(timeline.quarters).toHaveLength(4)
    expect(timeline.scheduledCount).toBe(1)
    expect(timeline.phases[0].scheduled[0]).toMatchObject({ completion: 100, evidenceCount: 1 })
    expect(timeline.phases[0].unscheduled[0]).toMatchObject({ timeRangeLabel: "Sem período" })
  })

  it("builds a selected inspector with item-specific history", () => {
    const roadmap = roadmapSchema.parse({
      schemaVersion: 1,
      projectId: "sample",
      phases: [{
        id: "phase_00000000-0000-4000-8000-000000000000",
        title: "Produto",
        outcome: "",
        status: "active",
        initiatives: [{
          id: "ini_00000000-0000-4000-8000-000000000001",
          title: "Planejamento",
          outcome: "",
          status: "planned",
          backlogIds: [],
        }],
      }],
      goals: [],
      scorecards: [],
      updatedAt: "2026-08-01T00:00:00.000Z",
      revision: "revision-1",
    })
    const timeline = toRoadmapTimelineViewModel(roadmap, [], "2026-08-01")
    const inspector = toRoadmapInspectorViewModel(timeline, "ini_00000000-0000-4000-8000-000000000001", [{
      schemaVersion: 1,
      id: "evt_00000000-0000-4000-8000-000000000003",
      projectId: "sample",
      actor: "human",
      action: "roadmap.initiative_updated",
      summary: "Iniciativa atualizada.",
      entityType: "roadmap",
      entityId: "ini_00000000-0000-4000-8000-000000000001",
      metadata: {},
      occurredAt: "2026-08-01T00:00:00.000Z",
    }])
    expect(inspector?.history).toHaveLength(1)
    expect(inspector?.roadmapRevision).toBe("revision-1")
  })

  it("positions markers by real date and exposes broken work item links", () => {
    const phaseId = "phase_11111111-1111-4111-8111-111111111111"
    const markerId = "marker_22222222-2222-4222-8222-222222222222"
    const roadmap = roadmapSchema.parse({
      schemaVersion: 1, projectId: "sample", goals: [], scorecards: [], updatedAt: "2026-08-01T00:00:00.000Z", revision: "revision-1",
      phases: [{ id: phaseId, title: "Entrega", outcome: "", status: "active", initiatives: [] }],
      markers: [{ id: markerId, phaseId, kind: "decision_gate", status: "pending_review", title: "Gate 1", description: "Revisar decisão", targetDate: "2026-09-15", backlogIds: ["wi_33333333-3333-4333-8333-333333333333"], references: [] }],
    })
    const timeline = toRoadmapTimelineViewModel(roadmap, [], "2026-08-01")
    expect(timeline.totalMarkers).toBe(1)
    expect(timeline.phases[0].markers[0]).toMatchObject({ kindLabel: "Gate de decisão", missingBacklogIds: ["wi_33333333-3333-4333-8333-333333333333"] })
    expect(timeline.phases[0].markers[0].left).toBeGreaterThan(0)
    expect(toRoadmapMarkerInspectorViewModel(timeline, markerId, [])?.roadmapRevision).toBe("revision-1")
  })
})
