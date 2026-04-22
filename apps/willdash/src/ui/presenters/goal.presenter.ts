import type { Goal, ActivityRecord, GoalStatus } from "../../domain/models"

export interface GoalViewModel {
  id: string
  title: string
  description: string
  unit: string
  progressLabel: string
  progressPct: number
  statusLabel: string
  statusTone: "brand" | "success" | "neutral"
  dueDisplay: string
}

export function toGoalViewModel(goal: Goal): GoalViewModel {
  const pct =
    goal.targetValue > 0
      ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
      : 0
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    unit: goal.unit,
    progressLabel: `${goal.currentValue} / ${goal.targetValue} ${goal.unit}`,
    progressPct: pct,
    statusLabel: statusLabel(goal.status),
    statusTone: goal.status === "completed" ? "success" : goal.status === "active" ? "brand" : "neutral",
    dueDisplay: goal.dueAt ? goal.dueAt.slice(0, 10) : "sem prazo",
  }
}

function statusLabel(s: GoalStatus): string {
  if (s === "active") return "Ativa"
  if (s === "completed") return "Concluida"
  return "Arquivada"
}

export interface ActivityViewModel {
  id: string
  kindLabel: string
  kindTone: "brand" | "neutral" | "success"
  note: string
  valueDisplay: string
  whenDisplay: string
  goalId?: string
}

export function toActivityViewModel(activity: ActivityRecord): ActivityViewModel {
  return {
    id: activity.id,
    kindLabel: activity.kind,
    kindTone:
      activity.kind === "milestone" ? "success" : activity.kind === "session" ? "brand" : "neutral",
    note: activity.note,
    valueDisplay: activity.value > 0 ? `+${activity.value}` : "—",
    whenDisplay: activity.createdAt.slice(0, 10),
    goalId: activity.goalId,
  }
}
