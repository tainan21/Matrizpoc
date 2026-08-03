import type { InboxItem, Sprint } from "../../domain/adaptive-work"
import type { AgentRequest, RoadmapInitiative, WorkItem } from "../../domain/schemas"

export interface WorkReferenceOptionViewModel {
  value: string
  label: string
  kind: WorkItem["kind"]
}

export function toWorkReferenceOptionViewModel(item: WorkItem, projectName: string): WorkReferenceOptionViewModel {
  return { value: `${item.projectId}:${item.id}`, label: `${projectName} · ${item.title}`, kind: item.kind }
}

export function toOutcomeReferenceOptionViewModel(item: WorkItem, projectName: string): WorkReferenceOptionViewModel {
  return { value: `work_item_outcome:${item.projectId}:${item.id}`, label: `${projectName} · ${item.title}`, kind: item.kind }
}

export function toInitiativeReferenceOptionViewModel(initiative: RoadmapInitiative, projectId: string, projectName: string): WorkReferenceOptionViewModel {
  return { value: `roadmap_initiative:${projectId}:${initiative.id}`, label: `${projectName} · ${initiative.title}`, kind: "outcome" }
}

const INBOX_ORIGIN_LABELS: Record<InboxItem["origin"], string> = {
  human: "Pessoa",
  codex_suggestion: "Sugestão Codex",
  external_issue: "Issue externa",
  repository_change: "Alteração no repositório",
  bug_report: "Bug",
  pending_decision: "Decisão pendente",
  documentation_drift: "Documentação divergente",
  uncatalogued_work: "Trabalho não catalogado",
}

const INBOX_STATUS_LABELS: Record<InboxItem["status"], string> = {
  untriaged: "A classificar",
  triaged: "Classificada",
  accepted: "Aceita",
  discarded: "Descartada",
}

export interface InboxItemViewModel {
  id: string
  title: string
  detail: string
  origin: InboxItem["origin"]
  originLabel: string
  status: InboxItem["status"]
  statusLabel: string
  reason: string
  confidenceLabel?: string
  suggestedProjectId?: string
  suggestedKind?: WorkItem["kind"]
  suggestedDomain?: string
  suggestedPriority?: WorkItem["priority"]
  groupKey?: string
  duplicateOf?: string
  decision?: { kind: "accepted"; href: string; label: string } | { kind: "discarded"; label: string }
  revision: string
  updatedLabel: string
}

export function toInboxItemViewModel(item: InboxItem): InboxItemViewModel {
  return {
    id: item.id,
    title: item.title,
    detail: item.detail,
    origin: item.origin,
    originLabel: INBOX_ORIGIN_LABELS[item.origin],
    status: item.status,
    statusLabel: INBOX_STATUS_LABELS[item.status],
    reason: item.reason,
    confidenceLabel: item.confidence === undefined ? undefined : `${Math.round(item.confidence * 100)}%`,
    suggestedProjectId: item.suggestedProjectId,
    suggestedKind: item.suggestedKind,
    suggestedDomain: item.suggestedDomain,
    suggestedPriority: item.suggestedPriority,
    groupKey: item.groupKey,
    duplicateOf: item.duplicateOf,
    decision: item.decision?.kind === "accepted"
      ? { kind: "accepted", href: `/projects/${item.decision.projectId}/backlog/${item.decision.workItemId}`, label: `${item.decision.projectId} · ${item.decision.workItemId}` }
      : item.decision?.kind === "discarded"
        ? { kind: "discarded", label: item.decision.reason }
        : undefined,
    revision: item.revision,
    updatedLabel: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.updatedAt)),
  }
}

export interface AdaptiveWorkItemViewModel {
  id: string
  projectId: string
  projectName: string
  href: string
  title: string
  kind: WorkItem["kind"]
  status: WorkItem["productStatus"]
  priority: WorkItem["priority"]
  domain: string
  responsible: string
  parentId?: string
  parentTitle?: string
  readinessLabel: string
  readinessGaps: string[]
  validationStatus: WorkItem["validationStatus"]
  humanReviewStatus: WorkItem["humanReviewStatus"]
  evidenceCount: number
  revision: string
}

export function toAdaptiveWorkItemViewModel(
  item: WorkItem,
  context: { projectName: string; parentTitle?: string },
): AdaptiveWorkItemViewModel {
  const gaps: string[] = []
  if (!item.description.trim()) gaps.push("contexto")
  if (!item.acceptanceCriteria.length) gaps.push("critérios")
  if (!item.responsible) gaps.push("responsável")
  if (item.blocker?.status === "open") gaps.push("bloqueio")
  return {
    id: item.id,
    projectId: item.projectId,
    projectName: context.projectName,
    href: `/projects/${item.projectId}/backlog/${item.id}`,
    title: item.title,
    kind: item.kind,
    status: item.productStatus,
    priority: item.priority,
    domain: item.domain ?? "Sem domínio",
    responsible: item.responsible ?? "Sem responsável",
    parentId: item.parentId,
    parentTitle: context.parentTitle,
    readinessLabel: gaps.length ? `${gaps.length} lacuna${gaps.length === 1 ? "" : "s"}` : "Pronto para compromisso",
    readinessGaps: gaps,
    validationStatus: item.validationStatus,
    humanReviewStatus: item.humanReviewStatus,
    evidenceCount: item.references.length,
    revision: item.revision,
  }
}

export interface SprintViewModel {
  id: string
  href: string
  name: string
  intent: string
  status: Sprint["status"]
  periodLabel: string
  wipLabel: string
  activeCount: number
  plannedCount: number
  reviewCount: number
  validationCount: number
  blockedCount: number
  validatedOutcomes: number
  outcomeCount: number
  confidenceLabel: string
  revision: string
}

export function toSprintViewModel(
  sprint: Sprint,
  workItems: WorkItem[],
  requests: AgentRequest[],
): SprintViewModel {
  const byId = new Map(workItems.map((item) => [`${item.projectId}:${item.id}`, item]))
  const sprintItems = sprint.work.map((ref) => byId.get(`${ref.projectId}:${ref.workItemId}`)).filter((item): item is WorkItem => Boolean(item))
  const completedAgentIds = new Set(requests.filter((request) => request.status === "completed").map((request) => `${request.projectId}:${request.backlogItemId}`))
  const activeCount = sprintItems.filter((item) => ["in_progress", "validation"].includes(item.productStatus)).length
  const reviewCount = sprintItems.filter((item) => completedAgentIds.has(`${item.projectId}:${item.id}`) && item.humanReviewStatus !== "approved").length
  const validationCount = sprintItems.filter((item) => item.productStatus === "validation" || (["feature", "bug", "outcome"].includes(item.kind) && item.validationStatus === "pending")).length
  return {
    id: sprint.id,
    href: `/work/sprints/${sprint.id}`,
    name: sprint.name,
    intent: sprint.intent,
    status: sprint.status,
    periodLabel: `${sprint.startDate.split("-").reverse().join("/")} → ${sprint.endDate.split("-").reverse().join("/")}`,
    wipLabel: `${activeCount}/${sprint.wipLimit}`,
    activeCount,
    plannedCount: sprintItems.length,
    reviewCount,
    validationCount,
    blockedCount: sprintItems.filter((item) => item.blocker?.status === "open").length,
    validatedOutcomes: sprint.outcomes.filter((outcome) => outcome.result === "validated").length,
    outcomeCount: sprint.outcomes.length,
    confidenceLabel: sprint.confidence ? `${sprint.confidence}/5` : "Não informada",
    revision: sprint.revision,
  }
}

export interface SprintDetailViewModel extends SprintViewModel {
  startDate: string
  endDate: string
  wipLimit: number
  wipOverrideReason: string
  confidence?: number
  confidenceRationale: string
  risksText: string
  outcomes: Array<{
    id: string
    title: string
    refLabel: string
    result?: string
    resultSummary: string
    evidenceText: string
  }>
  work: Array<{
    projectId: string
    workItemId: string
    title: string
    projectLabel: string
    outcomeCommitmentId: string
    executionLabel: string
    status: string
    reviewLabel: string
    validationLabel: string
    href: string
  }>
  dependencies: Array<{ id: string; fromLabel: string; toLabel: string; summary: string }>
  closure?: { summary: string; memoryDocumentRef: string; nextSprintId?: string; closedAt: string }
}

export function toSprintDetailViewModel(sprint: Sprint, workItems: WorkItem[], requests: AgentRequest[]): SprintDetailViewModel {
  const summary = toSprintViewModel(sprint, workItems, requests)
  const byId = new Map(workItems.map((item) => [`${item.projectId}:${item.id}`, item]))
  const requestsByWork = new Map<string, AgentRequest[]>()
  for (const request of requests) {
    const key = `${request.projectId}:${request.backlogItemId}`
    requestsByWork.set(key, [...(requestsByWork.get(key) ?? []), request])
  }
  return {
    ...summary,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    wipLimit: sprint.wipLimit,
    wipOverrideReason: sprint.wipOverrideReason ?? "",
    confidence: sprint.confidence,
    confidenceRationale: sprint.confidenceRationale,
    risksText: sprint.risks.join("\n"),
    outcomes: sprint.outcomes.map((outcome) => ({
      id: outcome.id,
      title: outcome.title,
      refLabel: outcome.ref.kind === "work_item_outcome"
        ? `${outcome.ref.projectId} · ${outcome.ref.workItemId}`
        : `${outcome.ref.projectId} · ${outcome.ref.initiativeId}`,
      result: outcome.result,
      resultSummary: outcome.resultSummary,
      evidenceText: outcome.evidenceRefs.join("\n"),
    })),
    work: sprint.work.map((reference) => {
      const key = `${reference.projectId}:${reference.workItemId}`
      const item = byId.get(key)
      const relatedRequests = requestsByWork.get(key) ?? []
      const agentCompleted = relatedRequests.some((request) => request.status === "completed")
      const agentRunning = relatedRequests.some((request) => ["claimed", "in_progress"].includes(request.status))
      const agentQueued = relatedRequests.some((request) => request.status === "queued")
      return {
        projectId: reference.projectId,
        workItemId: reference.workItemId,
        title: item?.title ?? "Trabalho ausente",
        projectLabel: reference.projectId,
        outcomeCommitmentId: reference.outcomeCommitmentId,
        executionLabel: agentCompleted
          ? "execução do agente concluída"
          : agentRunning
            ? "agente em execução"
            : agentQueued
              ? "agente na fila"
              : `${reference.executionMode} · não iniciada`,
        status: item?.productStatus ?? "missing",
        reviewLabel: agentCompleted ? item?.humanReviewStatus ?? "pending" : "sem execução de agente",
        validationLabel: item?.validationStatus ?? "desconhecida",
        href: `/projects/${reference.projectId}/backlog/${reference.workItemId}`,
      }
    }),
    dependencies: sprint.crossProjectDependencies.map((dependency) => ({
      id: `${dependency.fromProjectId}:${dependency.fromWorkItemId}:${dependency.toProjectId}:${dependency.toWorkItemId}`,
      fromLabel: `${dependency.fromProjectId} · ${dependency.fromWorkItemId}`,
      toLabel: `${dependency.toProjectId} · ${dependency.toWorkItemId}`,
      summary: dependency.summary,
    })),
    closure: sprint.closure ? { summary: sprint.closure.summary, memoryDocumentRef: sprint.closure.memoryDocumentRef, nextSprintId: sprint.closure.nextSprintId, closedAt: sprint.closure.closedAt } : undefined,
  }
}
