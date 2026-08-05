import type { CodexRunRecord } from "../../domain/codex-run"
import type { ActivityEvent, AgentRequest, WorkItem } from "../../domain/schemas"
import type { DeliveryEvidenceViewModel } from "./delivery-evidence-presenter"
import {
  toWorkItemInspectorViewModel,
  type WorkItemInspectorViewModel,
} from "./work-item-board-presenter"

export interface ExecutionReviewViewModel {
  requestId: string
  requestRevision: string
  runRevision?: string
  title: string
  requestStatus: AgentRequest["status"]
  runStatus?: CodexRunRecord["status"]
  claimedBy: string
  resultSummary: string
  changedFiles: string[]
  checks: string[]
  reviewStatus: "pending" | "approved" | "changes_requested"
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
  reviewIsStale: boolean
  canReview: boolean
}

export interface WorkItemRelationViewModel {
  id: string
  title: string
  kind: WorkItem["kind"]
  relation: "parent" | "child" | "dependency" | "dependent"
  status: WorkItem["productStatus"]
}

export interface WorkItemDetailViewModel extends WorkItemInspectorViewModel {
  createdAt: string
  updatedAt: string
  relations: WorkItemRelationViewModel[]
  executions: ExecutionReviewViewModel[]
  fullHistory: WorkItemInspectorViewModel["history"]
}

export function toExecutionReviewViewModel(
  request: AgentRequest,
  run?: CodexRunRecord,
): ExecutionReviewViewModel {
  return {
    requestId: request.id,
    requestRevision: request.revision,
    runRevision: run?.revision,
    title: request.title,
    requestStatus: request.status,
    runStatus: run?.status,
    claimedBy: request.claimedBy ?? "Não atribuído",
    resultSummary: request.resultSummary ?? run?.latestMessage ?? "Nenhum resultado registrado.",
    changedFiles: Array.from(new Set([...request.changedFiles, ...(run?.changedFiles ?? [])])),
    checks: Array.from(new Set([...request.checks, ...(run?.checks ?? [])])),
    reviewStatus: request.review?.status ?? "pending",
    reviewedBy: request.review?.reviewedBy,
    reviewedAt: request.review?.reviewedAt,
    reviewNote: request.review?.note,
    reviewIsStale: Boolean(request.review?.runRevision && run?.revision && request.review.runRevision !== run.revision),
    canReview: request.status === "completed",
  }
}

export function toWorkItemDetailViewModel(
  item: WorkItem,
  allItems: WorkItem[],
  requests: AgentRequest[],
  runs: Array<CodexRunRecord | undefined>,
  itemHistory: ActivityEvent[],
  requestHistory: ActivityEvent[],
  evidence: DeliveryEvidenceViewModel,
): WorkItemDetailViewModel {
  const byId = new Map(allItems.map((candidate) => [candidate.id, candidate]))
  const relation = (
    candidate: WorkItem | undefined,
    kind: WorkItemRelationViewModel["relation"],
  ): WorkItemRelationViewModel | undefined => candidate ? {
    id: candidate.id,
    title: candidate.title,
    kind: candidate.kind,
    relation: kind,
    status: candidate.productStatus,
  } : undefined
  const relations = [
    relation(item.parentId ? byId.get(item.parentId) : undefined, "parent"),
    ...allItems.filter((candidate) => candidate.parentId === item.id).map((candidate) => relation(candidate, "child")),
    ...item.dependencyIds.map((id) => relation(byId.get(id), "dependency")),
    ...allItems.filter((candidate) => candidate.dependencyIds.includes(item.id)).map((candidate) => relation(candidate, "dependent")),
  ].filter((candidate): candidate is WorkItemRelationViewModel => Boolean(candidate))
  const fullHistory = [...itemHistory, ...requestHistory]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .map((event) => ({
      id: event.id,
      actor: event.actor,
      action: event.action,
      summary: event.summary,
      occurredAt: event.occurredAt,
    }))
  return {
    ...toWorkItemInspectorViewModel(item, requests, itemHistory, evidence),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    relations,
    executions: requests.map((request, index) => toExecutionReviewViewModel(request, runs[index])),
    fullHistory,
  }
}
