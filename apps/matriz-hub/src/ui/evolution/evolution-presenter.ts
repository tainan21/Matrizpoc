import type { HubStatus } from "../environment/types"

export interface EvolutionBacklogItem {
  readonly id: string
  readonly title: string
  readonly description?: string
  readonly status: string
  readonly priority?: string
  readonly tags?: readonly string[]
  readonly acceptanceCriteria?: readonly { readonly id: string; readonly text: string; readonly completed: boolean }[]
  readonly updatedAt?: string
}

export interface EvolutionActivityItem {
  readonly id: string
  readonly actor: string
  readonly action: string
  readonly summary: string
  readonly entityType: string
  readonly entityId: string
  readonly metadata?: Record<string, unknown>
  readonly occurredAt: string
}

export interface EvolutionInput {
  readonly phases: readonly unknown[]
  readonly goals: readonly unknown[]
  readonly backlog: readonly EvolutionBacklogItem[]
  readonly activity: readonly EvolutionActivityItem[]
}

function backlogStatus(status: string): HubStatus {
  if (status === "done" || status === "complete") return "complete"
  if (status === "review") return "approval"
  if (status === "in_progress" || status === "active") return "running"
  if (status === "blocked") return "blocked"
  return "planned"
}

function backlogLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Em execução",
    blocked: "Bloqueado",
    complete: "Concluído",
    done: "Concluído",
    idea: "Em avaliação",
    in_progress: "Em execução",
    review: "Aguardando revisão",
  }
  return labels[status] ?? status.replaceAll("_", " ")
}

function humanActor(actor: string): string {
  return actor.split(/[-_.\s]+/).map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ")
}

export function presentEvolution(input: EvolutionInput) {
  const work = [...input.backlog]
    .sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""))
    .map((item) => {
      const criteria = item.acceptanceCriteria ?? []
      const completed = criteria.filter((criterion) => criterion.completed).length
      return {
        ...item,
        status: backlogStatus(item.status),
        statusLabel: backlogLabel(item.status),
        technicalStatus: item.status,
        progress: criteria.length ? Math.round((completed / criteria.length) * 100) : 0,
        completedCriteria: completed,
        totalCriteria: criteria.length,
      }
    })

  const actorMap = new Map<string, EvolutionActivityItem[]>()
  for (const item of input.activity) actorMap.set(item.actor, [...(actorMap.get(item.actor) ?? []), item])
  const actors = [...actorMap.entries()].map(([actor, items]) => ({
    id: actor,
    name: humanActor(actor),
    technicalName: actor,
    status: "archived" as const,
    statusLabel: "Atividade registrada",
    activityCount: items.length,
    lastActivityAt: [...items].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]?.occurredAt,
    lastSummary: [...items].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]?.summary,
  })).sort((a, b) => b.activityCount - a.activityCount)

  const releases = input.activity
    .filter((item) => item.action === "feature.implemented" || item.action === "feature.validated")
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((item) => ({
      ...item,
      label: item.action === "feature.validated" ? "Validado para uso" : "Implementação registrada",
      technicalLabel: item.action,
      status: (item.action === "feature.validated" ? "official" : "complete") as HubStatus,
    }))

  return {
    declaredPhaseCount: input.phases.length,
    declaredGoalCount: input.goals.length,
    work,
    actors,
    releases,
    activityCount: input.activity.length,
  }
}
