import type { ActivityEvent, AgentRequest, ProductStatus, WorkItem } from "../../domain/schemas"
import type { DeliveryEvidenceViewModel } from "./delivery-evidence-presenter"

export interface WorkItemCardViewModel {
  id: string
  title: string
  kind: WorkItem["kind"]
  kindLabel: string
  productStatus: ProductStatus
  priority: WorkItem["priority"]
  priorityLabel: string
  domain: string
  responsible: string
  completion: number
  criteriaCount: number
  referenceCount: number
  executionStatus: "none" | "queued" | "running" | "blocked" | "completed" | "cancelled"
  evidenceStatus: "missing" | "partial" | "sufficient"
  blocker?: string
  revision: string
}

export interface WorkItemColumnViewModel {
  id: Exclude<ProductStatus, "archived">
  title: string
  shortTitle: string
  items: WorkItemCardViewModel[]
}

export interface WorkItemBoardViewModel {
  columns: WorkItemColumnViewModel[]
  domains: string[]
  total: number
}

export interface WorkItemInspectorViewModel extends WorkItemCardViewModel {
  description: string
  parentId?: string
  originLabel?: string
  archiveReason?: string
  validationStatus: WorkItem["validationStatus"]
  humanReviewStatus: WorkItem["humanReviewStatus"]
  documentationStatus: WorkItem["documentationStatus"]
  tags: string[]
  acceptanceCriteria: Array<{ id: string; text: string; completed: boolean }>
  dependencyIds: string[]
  references: Array<{ kind: string; value: string; label: string }>
  history: Array<{ id: string; actor: string; action: string; summary: string; occurredAt: string }>
  evidence: DeliveryEvidenceViewModel
}

const COLUMN_LABELS: Record<Exclude<ProductStatus, "archived">, [string, string]> = {
  discovery: ["Descoberta", "Descoberta"],
  refined: ["Refinado", "Refinado"],
  ready: ["Pronto", "Pronto"],
  in_progress: ["Em execução", "Execução"],
  validation: ["Validação", "Validação"],
  completed: ["Concluído", "Concluído"],
}

export const BOARD_STATUSES = Object.keys(COLUMN_LABELS) as Array<Exclude<ProductStatus, "archived">>

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  ...Object.fromEntries(BOARD_STATUSES.map((status) => [status, COLUMN_LABELS[status][0]])),
  archived: "Arquivado",
} as Record<ProductStatus, string>

const KIND_LABELS: Record<WorkItem["kind"], string> = {
  outcome: "Outcome",
  feature: "Feature",
  task: "Task",
  bug: "Bug",
}

const PRIORITY_LABELS: Record<WorkItem["priority"], string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
}

function executionStatus(requests: AgentRequest[]): WorkItemCardViewModel["executionStatus"] {
  if (requests.some((request) => ["claimed", "in_progress"].includes(request.status))) return "running"
  if (requests.some((request) => request.status === "queued")) return "queued"
  if (requests.some((request) => request.status === "blocked")) return "blocked"
  if (requests.some((request) => request.status === "completed")) return "completed"
  if (requests.some((request) => request.status === "cancelled")) return "cancelled"
  return "none"
}

function evidenceStatus(item: WorkItem, requests: AgentRequest[]): WorkItemCardViewModel["evidenceStatus"] {
  if (item.references.length) return "sufficient"
  const completed = requests.filter((request) => request.status === "completed")
  if (completed.some((request) => request.checks.length && (request.changedFiles.length || request.resultSummary))) {
    return "sufficient"
  }
  if (completed.some((request) => request.checks.length || request.changedFiles.length || request.resultSummary)) {
    return "partial"
  }
  return "missing"
}

export function toWorkItemCardViewModel(
  item: WorkItem,
  requests: AgentRequest[],
): WorkItemCardViewModel {
  const related = requests.filter((request) => request.backlogItemId === item.id)
  const completed = item.acceptanceCriteria.filter((criterion) => criterion.completed).length
  return {
    id: item.id,
    title: item.title,
    kind: item.kind,
    kindLabel: KIND_LABELS[item.kind],
    productStatus: item.productStatus,
    priority: item.priority,
    priorityLabel: PRIORITY_LABELS[item.priority],
    domain: item.domain ?? "Sem domínio",
    responsible: item.responsible ?? "Não atribuído",
    completion: item.acceptanceCriteria.length
      ? Math.round((completed / item.acceptanceCriteria.length) * 100)
      : 0,
    criteriaCount: item.acceptanceCriteria.length,
    referenceCount: item.references.length,
    executionStatus: executionStatus(related),
    evidenceStatus: evidenceStatus(item, related),
    blocker: item.blocker?.status === "open" ? item.blocker.summary : undefined,
    revision: item.revision,
  }
}

export function toWorkItemBoardViewModel(
  items: WorkItem[],
  requests: AgentRequest[],
): WorkItemBoardViewModel {
  const cards = items
    .filter((item) => item.productStatus !== "archived")
    .map((item) => toWorkItemCardViewModel(item, requests))
  return {
    columns: BOARD_STATUSES.map((status) => ({
      id: status,
      title: COLUMN_LABELS[status][0],
      shortTitle: COLUMN_LABELS[status][1],
      items: cards.filter((card) => card.productStatus === status),
    })),
    domains: Array.from(new Set(cards.map((card) => card.domain))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    total: cards.length,
  }
}

export function toWorkItemInspectorViewModel(
  item: WorkItem,
  requests: AgentRequest[],
  history: ActivityEvent[],
  evidence: DeliveryEvidenceViewModel,
): WorkItemInspectorViewModel {
  return {
    ...toWorkItemCardViewModel(item, requests),
    description: item.description,
    parentId: item.parentId,
    originLabel: item.originRef ? `${item.originRef.kind} · ${item.originRef.id}` : undefined,
    archiveReason: item.archive?.reason,
    validationStatus: item.validationStatus,
    humanReviewStatus:
      requests.some((request) => request.backlogItemId === item.id) && item.humanReviewStatus === "not_required"
        ? "pending"
        : item.humanReviewStatus,
    documentationStatus: item.documentationStatus,
    tags: item.tags,
    acceptanceCriteria: item.acceptanceCriteria,
    dependencyIds: item.dependencyIds,
    references: item.references.map((reference) => ({
      kind: reference.kind,
      value: "path" in reference ? reference.path : "url" in reference ? reference.url : reference.documentId,
      label: reference.label ?? reference.kind,
    })),
    history: history.map((event) => ({
      id: event.id,
      actor: event.actor,
      action: event.action,
      summary: event.summary,
      occurredAt: event.occurredAt,
    })),
    evidence,
  }
}
