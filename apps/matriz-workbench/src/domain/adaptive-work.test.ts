import { describe, expect, it } from "vitest"
import { inboxItemSchema, sprintSchema } from "./adaptive-work"

const timestamp = "2026-08-03T12:00:00.000Z"
const revision = "revision-12345678"

describe("adaptive work contracts", () => {
  it("requires a recorded decision for terminal Inbox states", () => {
    expect(() => inboxItemSchema.parse({
      schemaVersion: 1,
      id: "in_00000000-0000-4000-8000-000000000000",
      title: "Documentação divergente",
      detail: "",
      origin: "human",
      reason: "",
      references: [],
      suggestedRelations: [],
      status: "discarded",
      createdAt: timestamp,
      updatedAt: timestamp,
      revision,
    })).toThrow(/motivo/i)
  })

  it("does not complete a sprint without outcome decisions and memory", () => {
    expect(() => sprintSchema.parse({
      schemaVersion: 1,
      id: "spr_00000000-0000-4000-8000-000000000000",
      name: "Sprint 1",
      intent: "Validar o ciclo adaptativo.",
      startDate: "2026-08-03",
      endDate: "2026-08-14",
      status: "completed",
      wipLimit: 4,
      confidenceRationale: "",
      risks: [],
      outcomes: [{
        id: "commit_00000000-0000-4000-8000-000000000001",
        ref: { kind: "work_item_outcome", projectId: "sample", workItemId: "wi_00000000-0000-4000-8000-000000000002" },
        title: "Fluxo validado",
        resultSummary: "",
        evidenceRefs: [],
      }],
      work: [],
      crossProjectDependencies: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      revision,
    })).toThrow(/memória final/i)
  })

  it("keeps planned work linked to an outcome commitment", () => {
    expect(() => sprintSchema.parse({
      schemaVersion: 1,
      id: "spr_00000000-0000-4000-8000-000000000000",
      name: "Sprint 1",
      intent: "Validar o ciclo adaptativo.",
      startDate: "2026-08-03",
      endDate: "2026-08-14",
      status: "planning",
      wipLimit: 4,
      confidenceRationale: "",
      risks: [],
      outcomes: [],
      work: [{
        projectId: "sample",
        workItemId: "wi_00000000-0000-4000-8000-000000000002",
        outcomeCommitmentId: "commit_00000000-0000-4000-8000-000000000001",
        executionMode: "human",
        addedAt: timestamp,
      }],
      crossProjectDependencies: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      revision,
    })).toThrow(/outcome comprometido/i)
  })

  it("requires an explicit next sprint for carry-over", () => {
    const parsed = sprintSchema.safeParse({
      schemaVersion: 1,
      id: "spr_00000000-0000-4000-8000-000000000000",
      name: "Sprint 1",
      intent: "Validar o ciclo adaptativo.",
      startDate: "2026-08-03",
      endDate: "2026-08-14",
      status: "completed",
      wipLimit: 4,
      confidenceRationale: "",
      risks: [],
      outcomes: [{
        id: "commit_00000000-0000-4000-8000-000000000001",
        ref: { kind: "work_item_outcome", projectId: "sample", workItemId: "wi_00000000-0000-4000-8000-000000000002" },
        title: "Fluxo validado",
        result: "carried_over",
        resultSummary: "Ainda depende de validação.",
        evidenceRefs: [],
      }],
      work: [],
      crossProjectDependencies: [],
      closure: { summary: "Carry-over necessário.", memoryDocumentRef: "product/sprint-1", closedBy: "human", closedAt: timestamp },
      createdAt: timestamp,
      updatedAt: timestamp,
      revision,
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues.some((issue) => issue.message.includes("sprint seguinte"))).toBe(true)
  })
})
