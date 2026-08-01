import type {
  BacklogItem,
  ProductStatus,
  WorkItem,
} from "./schemas"
import { WorkspaceError } from "./errors"

const LEGACY_STATUS: Record<BacklogItem["status"], ProductStatus> = {
  idea: "discovery",
  ready: "ready",
  in_progress: "in_progress",
  blocked: "ready",
  review: "validation",
  done: "completed",
  archived: "archived",
}

const V1_STATUS: Record<ProductStatus, BacklogItem["status"]> = {
  discovery: "idea",
  refined: "idea",
  ready: "ready",
  in_progress: "in_progress",
  validation: "review",
  completed: "done",
  archived: "archived",
}

const FLOW: ProductStatus[] = [
  "discovery",
  "refined",
  "ready",
  "in_progress",
  "validation",
  "completed",
]

export function normalizeLegacyWorkItem(item: BacklogItem): WorkItem {
  const productStatus = LEGACY_STATUS[item.status]
  return {
    ...item,
    schemaVersion: 2,
    kind: "task",
    productStatus,
    validationStatus: productStatus === "completed" ? "passed" : "pending",
    humanReviewStatus: "not_required",
    documentationStatus: "not_required",
    blocker:
      item.status === "blocked"
        ? { summary: "Bloqueio legado sem descrição estruturada.", status: "open", updatedAt: item.updatedAt }
        : undefined,
  }
}

export function toLegacyBacklogItem(item: WorkItem): BacklogItem {
  return {
    schemaVersion: 1,
    id: item.id as BacklogItem["id"],
    projectId: item.projectId,
    title: item.title,
    description: item.description,
    status: item.blocker?.status === "open" ? "blocked" : V1_STATUS[item.productStatus],
    priority: item.priority,
    workScope: item.workScope,
    tags: item.tags,
    acceptanceCriteria: item.acceptanceCriteria,
    dependencyIds: item.dependencyIds.filter((value): value is BacklogItem["id"] => value.startsWith("tsk_")),
    references: item.references,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    revision: item.revision,
  }
}

export function canTransitionWorkItem(from: ProductStatus, to: ProductStatus): boolean {
  if (from === to) return true
  if (to === "archived") return true
  if (from === "archived") return false
  const fromIndex = FLOW.indexOf(from)
  const toIndex = FLOW.indexOf(to)
  return fromIndex >= 0 && toIndex >= 0 && Math.abs(fromIndex - toIndex) === 1
}

export function assertWorkItemTransition(item: WorkItem, target: ProductStatus): void {
  if (!canTransitionWorkItem(item.productStatus, target)) {
    throw new WorkspaceError("A mudança de estado precisa seguir o fluxo adjacente do quadro.", "INVALID_DATA")
  }
  if (target === "in_progress" && item.blocker?.status === "open") {
    throw new WorkspaceError("Resolva o bloqueio antes de iniciar o trabalho.", "INVALID_DATA")
  }
}

export function assertWorkItemCompletion(
  item: WorkItem,
  context: { hasEvidence: boolean; hasAgentExecution: boolean },
): void {
  if (!item.acceptanceCriteria.length || item.acceptanceCriteria.some((criterion) => !criterion.completed)) {
    throw new WorkspaceError("Conclua todos os critérios de aceite antes de finalizar.", "INVALID_DATA")
  }
  if (!context.hasEvidence) {
    throw new WorkspaceError("Vincule uma evidência revisável antes de finalizar.", "INVALID_DATA")
  }
  if (
    ["feature", "bug", "outcome"].includes(item.kind) &&
    !["passed", "waived"].includes(item.validationStatus)
  ) {
    throw new WorkspaceError("Registre a validação antes de finalizar este tipo de trabalho.", "INVALID_DATA")
  }
  if (context.hasAgentExecution && item.humanReviewStatus !== "approved") {
    throw new WorkspaceError("A execução do agente ainda precisa de aprovação humana.", "INVALID_DATA")
  }
  if (item.documentationStatus === "stale") {
    throw new WorkspaceError("Atualize ou dispense explicitamente a documentação antes de finalizar.", "INVALID_DATA")
  }
  if (item.kind === "outcome" && item.documentationStatus !== "current") {
    throw new WorkspaceError("Outcomes exigem documentação atualizada.", "INVALID_DATA")
  }
}
