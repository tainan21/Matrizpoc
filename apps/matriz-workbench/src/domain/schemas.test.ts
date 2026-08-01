import { describe, expect, it } from "vitest"
import { createMaturityGoalCatalog } from "../application/maturity-goal-catalog"
import {
  attachmentReferenceSchema,
  backlogItemSchema,
  backlogStatusSchema,
  roadmapInitiativeSchema,
  roadmapSchema,
  workItemV2Schema,
} from "./schemas"

describe("Workbench schemas", () => {
  it("rejects unsupported backlog state", () => {
    expect(backlogStatusSchema.safeParse("deleted").success).toBe(false)
  })

  it("rejects script-bearing external URLs", () => {
    expect(
      attachmentReferenceSchema.safeParse({
        kind: "external_url",
        url: "javascript:alert(1)",
      }).success,
    ).toBe(false)
  })

  it("accepts only explicit reference kinds", () => {
    expect(
      attachmentReferenceSchema.safeParse({
        kind: "filesystem",
        path: "../../secret",
      }).success,
    ).toBe(false)
  })

  it("creates a complete binary 0-100 maturity catalog", () => {
    const goals = createMaturityGoalCatalog()
    expect(goals).toHaveLength(100)
    expect(goals.map((goal) => goal.ordinal)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    )
    expect(new Set(goals.map((goal) => goal.id)).size).toBe(100)
    expect(new Set(goals.map((goal) => goal.category)).size).toBe(10)
    expect(goals.every((goal) => goal.score === 0)).toBe(true)
  })

  it("rejects duplicated score ordinals", () => {
    const [first, second] = createMaturityGoalCatalog()
    expect(
      roadmapSchema.safeParse({
        schemaVersion: 1,
        projectId: "sample",
        phases: [],
        goals: [{ ...first, ordinal: 1 }, { ...second, ordinal: 1 }],
        updatedAt: new Date().toISOString(),
        revision: "revision-1",
      }).success,
    ).toBe(false)
  })

  it("accepts temporal roadmap initiatives linked to V1 and V2 work items", () => {
    const initiative = {
      id: "ini_00000000-0000-4000-8000-000000000000",
      title: "Planejamento colaborativo",
      outcome: "Times operam o roadmap com contexto revisável.",
      status: "active" as const,
      domain: "Plataforma / Roadmap",
      responsible: "Produto",
      startDate: "2026-08-01",
      targetDate: "2026-09-30",
      backlogIds: [
        "tsk_00000000-0000-4000-8000-000000000001",
        "wi_00000000-0000-4000-8000-000000000002",
      ],
    }

    expect(roadmapInitiativeSchema.parse(initiative)).toEqual(initiative)
    expect(
      roadmapInitiativeSchema.safeParse({
        ...initiative,
        startDate: "2026-10-01",
        targetDate: "2026-09-30",
      }).success,
    ).toBe(false)
  })

  it("defaults old backlog records to project scope and accepts site scope", () => {
    const base = {
      schemaVersion: 1 as const,
      id: "tsk_00000000-0000-4000-8000-000000000000",
      projectId: "sites",
      title: "Review metadata",
      description: "",
      status: "idea" as const,
      priority: "medium" as const,
      tags: [],
      acceptanceCriteria: [],
      dependencyIds: [],
      references: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: "revision-1",
    }

    expect(backlogItemSchema.parse(base).workScope).toEqual({
      kind: "project",
    })
    expect(
      backlogItemSchema.parse({
        ...base,
        workScope: { kind: "site", id: "example" },
      }).workScope,
    ).toEqual({ kind: "site", id: "example" })
    expect(
      backlogItemSchema.safeParse({
        ...base,
        workScope: { kind: "site", id: "../outside" },
      }).success,
    ).toBe(false)
  })

  it("accepts the independent governance states of a V2 work item", () => {
    const timestamp = new Date().toISOString()
    const item = workItemV2Schema.parse({
      schemaVersion: 2,
      id: "wi_00000000-0000-4000-8000-000000000000",
      projectId: "matriz-workbench",
      kind: "feature",
      title: "Operational board",
      description: "",
      productStatus: "validation",
      validationStatus: "pending",
      humanReviewStatus: "pending",
      documentationStatus: "current",
      priority: "high",
      workScope: { kind: "project" },
      tags: [],
      acceptanceCriteria: [],
      dependencyIds: [],
      references: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      revision: "revision-1",
    })

    expect(item.productStatus).toBe("validation")
    expect(item.validationStatus).toBe("pending")
    expect(item.humanReviewStatus).toBe("pending")
  })
})
