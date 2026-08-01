import { describe, expect, it } from "vitest"
import { toWorkItemBoardViewModel, toWorkItemInspectorViewModel } from "./work-item-board-presenter"
import type { AgentRequest, WorkItem } from "../../domain/schemas"

const timestamp = "2026-08-01T12:00:00.000Z"
const item: WorkItem = {
  schemaVersion: 2,
  id: "wi_11111111-1111-4111-8111-111111111111",
  projectId: "sample",
  kind: "feature",
  title: "Board operacional",
  description: "Contexto",
  productStatus: "in_progress",
  validationStatus: "pending",
  humanReviewStatus: "not_required",
  documentationStatus: "pending",
  priority: "high",
  domain: "Plataforma",
  responsible: "Zara",
  workScope: { kind: "project" },
  tags: [],
  acceptanceCriteria: [],
  dependencyIds: [],
  references: [],
  createdAt: timestamp,
  updatedAt: timestamp,
  revision: "12345678",
}

const request: AgentRequest = {
  schemaVersion: 1,
  id: "req_11111111-1111-4111-8111-111111111111",
  projectId: "sample",
  backlogItemId: item.id,
  title: item.title,
  instructions: "",
  status: "completed",
  claimedBy: "codex",
  resultSummary: "Implementado",
  changedFiles: ["apps/sample/page.tsx"],
  checks: ["pnpm test"],
  createdAt: timestamp,
  updatedAt: timestamp,
  revision: "12345678",
}

describe("work item board presenter", () => {
  it("maps work into the correct column with independent execution state", () => {
    const board = toWorkItemBoardViewModel([item], [request])
    expect(board.columns.find((column) => column.id === "in_progress")?.items[0]).toMatchObject({
      productStatus: "in_progress",
      executionStatus: "completed",
      evidenceStatus: "sufficient",
    })
  })

  it("requires human review in the view when an agent participated", () => {
    const inspector = toWorkItemInspectorViewModel(item, [request], [], {
      runs: [], hasSuccessfulChecks: true, hasChangedFiles: true,
      hasPullRequest: false, hasReadyPreview: false,
    })
    expect(inspector.humanReviewStatus).toBe("pending")
    expect(inspector.productStatus).toBe("in_progress")
  })
})
