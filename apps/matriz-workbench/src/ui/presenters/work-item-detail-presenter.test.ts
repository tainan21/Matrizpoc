import { describe, expect, it } from "vitest"
import type { AgentRequest, WorkItem } from "../../domain/schemas"
import { toWorkItemDetailViewModel } from "./work-item-detail-presenter"

const emptyEvidence = {
  runs: [],
  hasSuccessfulChecks: false,
  hasChangedFiles: false,
  hasPullRequest: false,
  hasReadyPreview: false,
}

function item(id: string, patch: Partial<WorkItem> = {}): WorkItem {
  return {
    schemaVersion: 2,
    id,
    projectId: "sample",
    kind: "feature",
    title: id,
    description: "",
    productStatus: "validation",
    validationStatus: "pending",
    humanReviewStatus: "pending",
    documentationStatus: "current",
    priority: "high",
    workScope: { kind: "project" },
    tags: [], acceptanceCriteria: [], dependencyIds: [], references: [],
    createdAt: "2026-08-03T10:00:00.000Z",
    updatedAt: "2026-08-03T11:00:00.000Z",
    revision: "revision-1",
    ...patch,
  }
}

describe("work item detail presenter", () => {
  it("projects relations and keeps execution review separate from product state", () => {
    const target = item("wi_00000000-0000-4000-8000-000000000001", {
      dependencyIds: ["wi_00000000-0000-4000-8000-000000000002"],
    })
    const dependency = item("wi_00000000-0000-4000-8000-000000000002")
    const request: AgentRequest = {
      schemaVersion: 1,
      id: "req_00000000-0000-4000-8000-000000000001",
      projectId: "sample",
      backlogItemId: target.id,
      title: "Execution",
      instructions: "",
      status: "completed",
      resultSummary: "Verified",
      changedFiles: [], checks: ["pnpm test"],
      review: { status: "approved", reviewedBy: "Zara", reviewedAt: "2026-08-03T12:00:00.000Z", note: "OK" },
      createdAt: "2026-08-03T10:00:00.000Z",
      updatedAt: "2026-08-03T12:00:00.000Z",
      revision: "request-revision",
    }
    const detail = toWorkItemDetailViewModel(target, [target, dependency], [request], [undefined], [], [], emptyEvidence)
    expect(detail.relations).toContainEqual(expect.objectContaining({ id: dependency.id, relation: "dependency" }))
    expect(detail.executions[0]).toMatchObject({ reviewStatus: "approved", canReview: true })
    expect(detail.productStatus).toBe("validation")
    expect(detail.validationStatus).toBe("pending")
  })
})
