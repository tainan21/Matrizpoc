import type { HubStatus } from "../environment/types"

export interface ActivitySource {
  readonly id: string
  readonly type: string
  readonly source: string
  readonly occurredAt: string
  readonly version?: string
  readonly category?: string
}

export interface ActivityItemVM extends ActivitySource {
  readonly kind: "event" | "telemetry"
  readonly label: string
  readonly technicalLabel: string
  readonly status: HubStatus
}

export interface ActivityVM {
  readonly items: readonly ActivityItemVM[]
  readonly eventCount: number
  readonly telemetryCount: number
  readonly sources: readonly { readonly source: string; readonly count: number }[]
}

export function humanizeTechnicalName(value: string): string {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1))
    .join(" · ")
}

export function presentActivity(
  events: readonly ActivitySource[],
  telemetry: readonly ActivitySource[],
): ActivityVM {
  const items = [
    ...events.map<ActivityItemVM>((item) => ({ ...item, kind: "event", label: humanizeTechnicalName(item.type), technicalLabel: item.type, status: "available" })),
    ...telemetry.map<ActivityItemVM>((item) => ({ ...item, kind: "telemetry", label: humanizeTechnicalName(item.type), technicalLabel: item.type, status: "running" })),
  ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
  const bySource = new Map<string, number>()
  for (const item of items) bySource.set(item.source, (bySource.get(item.source) ?? 0) + 1)
  return {
    items,
    eventCount: events.length,
    telemetryCount: telemetry.length,
    sources: [...bySource].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
  }
}

export interface OnboardingStateVM {
  readonly status: HubStatus
  readonly label: string
  readonly technicalLabel: string
  readonly progress: number
}

export function presentOnboarding(progress: { readonly completedAt?: string; readonly appPayloadCount: number } | undefined): OnboardingStateVM {
  if (!progress) return { status: "planned", label: "Ainda não iniciado", technicalLabel: "not-started", progress: 0 }
  if (progress.completedAt) return { status: "complete", label: "Configuração concluída", technicalLabel: "completed", progress: 100 }
  return { status: "running", label: "Configuração em andamento", technicalLabel: "in-progress", progress: Math.min(90, 20 + progress.appPayloadCount * 15) }
}

export function presentFeatureFlag(flag: { readonly flag: string; readonly enabled: boolean }) {
  const words: Record<string, string> = {
    new: "Novo",
    enabled: "Ativo",
    beta: "Beta",
    onboarding: "onboarding",
    checkout: "checkout",
    dashboard: "painel",
  }
  return {
    label: flag.flag.split("-").map((part) => words[part] ?? (part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1))).join(" "),
    technicalLabel: flag.flag,
    enabled: flag.enabled,
    status: flag.enabled ? "available" as const : "archived" as const,
    statusLabel: flag.enabled ? "Disponível" : "Desativada",
  }
}
