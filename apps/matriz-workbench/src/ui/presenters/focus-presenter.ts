import type { AgentRequest, BacklogItem } from "../../domain/schemas"
import type { ProjectNavViewModel } from "./workspace-presenters"

const WORK_ITEM_STATUS_LABELS: Record<BacklogItem["status"], string> = {
  idea: "Ideia",
  ready: "Pronta",
  in_progress: "Em andamento",
  blocked: "Bloqueada",
  review: "Em revisão",
  done: "Concluída",
  archived: "Arquivada",
}

const PRIORITY_LABELS: Record<BacklogItem["priority"], string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
}

const AGENT_REQUEST_STATUS_LABELS: Record<AgentRequest["status"], string> = {
  queued: "Na fila",
  claimed: "Assumida",
  in_progress: "Em andamento",
  blocked: "Bloqueada",
  interrupted: "Interrompida",
  completed: "Concluída",
  cancelled: "Cancelada",
}

export interface FocusWorkItemViewModel {
  id: string
  href: string
  title: string
  status: BacklogItem["status"]
  statusLabel: string
  priority: BacklogItem["priority"]
  priorityLabel: string
  shortReference: string
  fullReference: string
  projectLabel: string
}

export interface FocusAgentRequestViewModel {
  id: string
  href: string
  title: string
  status: AgentRequest["status"]
  statusLabel: string
  projectLabel: string
}

export function toFocusWorkItemViewModel({
  item,
  project,
}: {
  item: BacklogItem
  project: ProjectNavViewModel
}): FocusWorkItemViewModel {
  const prefix = item.id.slice(0, item.id.indexOf("_") + 1)
  return {
    id: item.id,
    href: `/projects/${project.id}/backlog/${item.id}`,
    title: item.title,
    status: item.status,
    statusLabel: WORK_ITEM_STATUS_LABELS[item.status],
    priority: item.priority,
    priorityLabel: PRIORITY_LABELS[item.priority],
    shortReference: `${prefix}…${item.id.slice(-6)}`,
    fullReference: item.id,
    projectLabel: project.displayName,
  }
}

export function toFocusAgentRequestViewModel({
  project,
  request,
}: {
  project: ProjectNavViewModel
  request: AgentRequest
}): FocusAgentRequestViewModel {
  return {
    id: request.id,
    href: `/projects/${project.id}/agents#${request.id}`,
    title: request.title,
    status: request.status,
    statusLabel: AGENT_REQUEST_STATUS_LABELS[request.status],
    projectLabel: project.displayName,
  }
}
