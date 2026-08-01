import { buildScoreSummary, DEFAULT_SCORE_POLICY, getBacklogInsights } from "./control"
import type { EvidenceProposal, ScorePolicy, ScoreSummary, Snippet, ControlApproval, ControlEntity, ControlNotification } from "../domain/control"
import type { ActivityEvent, BacklogItem } from "../domain/schemas"
import type { WorkspaceRepository } from "../integration/filesystem/workspace-repository"

export interface ControlProjectSnapshot {
  projectId: string
  displayName: string
  summary: ScoreSummary
  policy: ScorePolicy
  evidence: EvidenceProposal[]
  approvals: ControlApproval[]
  notifications: ControlNotification[]
  entities: ControlEntity[]
  snippets: Snippet[]
  insights: ReturnType<typeof getBacklogInsights>
  activity: ActivityEvent[]
  backlog: BacklogItem[]
}

export interface ControlSnapshot {
  selectedProjectId?: string
  projects: ControlProjectSnapshot[]
  aggregate: number
  pendingApprovals: number
  activeEntities: number
  insights: number
}

async function buildProject(repository: WorkspaceRepository, projectId: string): Promise<ControlProjectSnapshot | null> {
  const project = await repository.getProject(projectId)
  if (!project.initialized || project.corrupted) return null
  const [roadmap, policy, evidence, approvals, notifications, entities, snippets, activity, backlog] = await Promise.all([
    repository.getRoadmap(projectId),
    repository.getControlPolicy(projectId).catch(() => ({ ...DEFAULT_SCORE_POLICY, projectId })),
    repository.listControlEvidence(projectId),
    repository.listControlApprovals(projectId),
    repository.listControlNotifications(projectId),
    repository.listControlEntities(projectId),
    repository.listSnippets(projectId),
    repository.listActivity(projectId, undefined, 20),
    repository.listBacklog(projectId),
  ])
  return {
    projectId,
    displayName: project.displayName,
    summary: buildScoreSummary(roadmap, policy, evidence),
    policy,
    evidence,
    approvals,
    notifications,
    entities,
    snippets,
    insights: getBacklogInsights(backlog),
    activity,
    backlog,
  }
}

export async function buildControlSnapshot(repository: WorkspaceRepository, selectedProjectId?: string): Promise<ControlSnapshot> {
  const projects = (await repository.discoverProjects()).filter((project) => !selectedProjectId || project.id === selectedProjectId)
  const snapshots = (await Promise.all(projects.map((project) => buildProject(repository, project.id)))).filter((item): item is ControlProjectSnapshot => item !== null)
  const aggregate = snapshots.length ? Math.round(snapshots.reduce((total, item) => total + item.summary.aggregate, 0) / snapshots.length) : 0
  return {
    selectedProjectId,
    projects: snapshots,
    aggregate,
    pendingApprovals: snapshots.reduce((total, item) => total + item.evidence.filter((evidence) => evidence.status === "proposed").length, 0),
    activeEntities: snapshots.reduce((total, item) => total + item.entities.filter((entity) => entity.status === "active").length, 0),
    insights: snapshots.reduce((total, item) => total + item.insights.length, 0),
  }
}
