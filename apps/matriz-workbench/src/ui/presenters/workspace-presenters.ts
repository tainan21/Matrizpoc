import type {
  AgentRequest,
  BacklogItem,
  ProjectWorkspace,
  Roadmap,
} from "../../domain/schemas"
import type { DiscoveredProject } from "../../integration/filesystem/workspace-repository"

export interface ProjectNavViewModel {
  id: string
  displayName: string
  initialized: boolean
  corrupted: boolean
}

export function toProjectNavViewModel(project: DiscoveredProject): ProjectNavViewModel {
  return {
    id: project.id,
    displayName: project.displayName,
    initialized: project.initialized,
    corrupted: project.corrupted,
  }
}

export interface BacklogViewModel extends BacklogItem {
  statusLabel: string
  priorityLabel: string
  completion: number
}

const STATUS_LABELS: Record<BacklogItem["status"], string> = {
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

export function toBacklogViewModel(item: BacklogItem): BacklogViewModel {
  const completed = item.acceptanceCriteria.filter((criterion) => criterion.completed).length
  return {
    ...item,
    statusLabel: STATUS_LABELS[item.status],
    priorityLabel: PRIORITY_LABELS[item.priority],
    completion: item.acceptanceCriteria.length
      ? Math.round((completed / item.acceptanceCriteria.length) * 100)
      : 0,
  }
}

export interface ProjectSummaryViewModel {
  project: ProjectWorkspace
  activeTasks: number
  blockedTasks: number
  doneTasks: number
  queuedRequests: number
  roadmapProgress: number
}

export function toProjectSummaryViewModel(
  project: ProjectWorkspace,
  backlog: BacklogItem[],
  requests: AgentRequest[],
  roadmap: Roadmap,
): ProjectSummaryViewModel {
  const initiatives = roadmap.phases.flatMap((phase) => phase.initiatives)
  const completed = initiatives.filter((initiative) => initiative.status === "completed").length
  const completedGoals = roadmap.goals.filter((goal) => goal.score === 1).length
  return {
    project,
    activeTasks: backlog.filter((item) =>
      ["ready", "in_progress", "review"].includes(item.status),
    ).length,
    blockedTasks: backlog.filter((item) => item.status === "blocked").length,
    doneTasks: backlog.filter((item) => item.status === "done").length,
    queuedRequests: requests.filter((request) => request.status === "queued").length,
    roadmapProgress: roadmap.goals.length
      ? completedGoals
      : initiatives.length
        ? Math.round((completed / initiatives.length) * 100)
        : 0,
  }
}
