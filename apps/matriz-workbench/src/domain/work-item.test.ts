import { describe, expect, it } from "vitest"
import { assertWorkItemCompletion, canTransitionWorkItem, normalizeLegacyWorkItem } from "./work-item"
import type { BacklogItem, WorkItem } from "./schemas"

const timestamp = "2026-08-01T12:00:00.000Z"

function item(patch: Partial<WorkItem> = {}): WorkItem {
  return {
    schemaVersion: 2,
    id: "wi_11111111-1111-4111-8111-111111111111",
    projectId: "sample",
    kind: "feature",
    title: "Board operacional",
    description: "",
    productStatus: "validation",
    validationStatus: "passed",
    humanReviewStatus: "approved",
    documentationStatus: "current",
    priority: "high",
    workScope: { kind: "project" },
    tags: [],
    acceptanceCriteria: [{ id: "ac_11111111-1111-4111-8111-111111111111", text: "Validado", completed: true }],
    dependencyIds: [],
    references: [{ kind: "repository_file", path: "apps/sample/page.tsx" }],
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: "12345678",
    ...patch,
  }
}

describe("work item policy", () => {
  it("maps V1 without mutating its identity", () => {
    const legacy: BacklogItem = {
      schemaVersion: 1,
      id: "tsk_11111111-1111-4111-8111-111111111111",
      projectId: "sample",
      title: "Legacy",
      description: "",
      status: "blocked",
      priority: "medium",
      workScope: { kind: "project" },
      tags: [], acceptanceCriteria: [], dependencyIds: [], references: [],
      createdAt: timestamp, updatedAt: timestamp, revision: "12345678",
    }
    expect(normalizeLegacyWorkItem(legacy)).toMatchObject({
      id: legacy.id,
      schemaVersion: 2,
      productStatus: "ready",
      blocker: { status: "open" },
    })
  })

  it("allows only adjacent transitions plus archive", () => {
    expect(canTransitionWorkItem("ready", "in_progress")).toBe(true)
    expect(canTransitionWorkItem("ready", "completed")).toBe(false)
    expect(canTransitionWorkItem("discovery", "archived")).toBe(true)
  })

  it("separates agent completion from human product approval", () => {
    expect(() => assertWorkItemCompletion(item({ humanReviewStatus: "pending" }), {
      hasEvidence: true,
      hasAgentExecution: true,
    })).toThrow(/aprovação humana/)
    expect(() => assertWorkItemCompletion(item(), {
      hasEvidence: true,
      hasAgentExecution: true,
    })).not.toThrow()
  })
})
