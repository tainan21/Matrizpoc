import type {
  HubActionVM,
  HubActivityItemVM,
  HubAttentionItemVM,
  HubOverviewVM,
  HubProjectHealth,
  HubStatus,
} from "./types"

export interface HubOverviewAppSource {
  readonly appId: string
  readonly name: string
  readonly description: string
  readonly enabled: boolean
  readonly capabilitiesCount: number
  readonly routesCount: number
  readonly integrationsCount: number
}

export interface HubOverviewProjectSource {
  readonly projectId: string
  readonly displayName: string
  readonly healthStatus: HubProjectHealth
  readonly readinessScore: number
  readonly lastCheckAt: string
  readonly accentColor?: string
}

export interface HubOverviewActivitySource {
  readonly id: string
  readonly type: string
  readonly source: string
  readonly occurredAt: string
}

export interface HubOverviewSource {
  readonly generatedAt: string
  readonly apps: readonly HubOverviewAppSource[]
  readonly projects: readonly HubOverviewProjectSource[]
  readonly events: readonly HubOverviewActivitySource[]
  readonly telemetry: readonly HubOverviewActivitySource[]
  readonly institutionalUpdatedAt?: string
}

const HEALTH_PRESENTATION: Record<
  HubProjectHealth,
  { readonly status: HubStatus; readonly label: string; readonly priority: number }
> = {
  healthy: { status: "complete", label: "Saudável", priority: 3 },
  degraded: { status: "attention", label: "Requer atenção", priority: 1 },
  offline: { status: "blocked", label: "Sem resposta", priority: 0 },
  unknown: { status: "unknown", label: "Sem sinal", priority: 2 },
}

function toAttentionItem(project: HubOverviewProjectSource): HubAttentionItemVM {
  const presentation = HEALTH_PRESENTATION[project.healthStatus]
  return {
    id: project.projectId,
    label: project.displayName,
    description: `${project.readinessScore}% de readiness · última leitura ${project.lastCheckAt}`,
    status: presentation.status,
    statusLabel: presentation.label,
    href: `/projects/${encodeURIComponent(project.projectId)}`,
  }
}

function toNextAction(
  projects: readonly HubOverviewProjectSource[],
): HubActionVM {
  const target = projects
    .slice()
    .sort((left, right) => left.readinessScore - right.readinessScore)[0]

  if (!target) {
    return {
      label: "Explorar projetos",
      technicalLabel: "Registry",
      description: "O registry ainda não possui um projeto institucional para revisar.",
      consequence: "Abre a visão completa de projetos registrados.",
      href: "/projects",
      status: "available",
    }
  }

  const presentation = HEALTH_PRESENTATION[target.healthStatus]
  return {
    label:
      target.healthStatus === "healthy"
        ? `Acompanhar ${target.displayName}`
        : `Revisar ${target.displayName}`,
    technicalLabel: "Readiness",
    description: `${target.displayName} possui a menor leitura de readiness disponível: ${target.readinessScore}%.`,
    consequence: "Abre os checks e a origem da leitura institucional.",
    href: `/projects/${encodeURIComponent(target.projectId)}`,
    status: presentation.status,
  }
}

function toActivity(
  events: readonly HubOverviewActivitySource[],
  telemetry: readonly HubOverviewActivitySource[],
): readonly HubActivityItemVM[] {
  return [
    ...events.map<HubActivityItemVM>((item) => ({
      id: item.id,
      kind: "event",
      label: item.type,
      source: item.source,
      occurredAt: item.occurredAt,
      status: "available",
    })),
    ...telemetry.map<HubActivityItemVM>((item) => ({
      id: item.id,
      kind: "telemetry",
      label: item.type,
      source: item.source,
      occurredAt: item.occurredAt,
      status: "running",
    })),
  ]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 8)
}

export function toHubOverviewVM(source: HubOverviewSource): HubOverviewVM {
  const projectsById = new Map(
    source.projects.map((project) => [project.projectId, project]),
  )
  const attentionProjects = source.projects
    .filter((project) => project.healthStatus !== "healthy")
    .slice()
    .sort((left, right) => {
      const priority =
        HEALTH_PRESENTATION[left.healthStatus].priority -
        HEALTH_PRESENTATION[right.healthStatus].priority
      return priority || left.readinessScore - right.readinessScore
    })

  const healthCounts = source.projects.reduce(
    (counts, project) => {
      counts[project.healthStatus] += 1
      return counts
    },
    { healthy: 0, degraded: 0, offline: 0, unknown: 0 },
  )
  const averageReadiness = source.projects.length
    ? Math.round(
        source.projects.reduce(
          (total, project) => total + project.readinessScore,
          0,
        ) / source.projects.length,
      )
    : 0
  const activity = toActivity(source.events, source.telemetry)

  return {
    generatedAt: source.generatedAt,
    portfolio: source.apps.map((app) => {
      const project = projectsById.get(app.appId)
      const presentation = project
        ? HEALTH_PRESENTATION[project.healthStatus]
        : app.enabled
          ? { status: "available" as const, label: "Registrado" }
          : { status: "unavailable" as const, label: "Desabilitado" }
      return {
        appId: app.appId,
        name: app.name,
        description: app.description,
        status: presentation.status,
        statusLabel: presentation.label,
        readinessScore: project?.readinessScore,
        capabilitiesCount: app.capabilitiesCount,
        routesCount: app.routesCount,
        accentColor: project?.accentColor,
        href: `/catalog#${encodeURIComponent(app.appId)}`,
      }
    }),
    health: {
      total: source.projects.length,
      ...healthCounts,
      averageReadiness,
      status:
        healthCounts.offline > 0
          ? "blocked"
          : healthCounts.degraded > 0
            ? "attention"
            : healthCounts.unknown > 0
              ? "unknown"
              : source.projects.length > 0
                ? "complete"
                : "unavailable",
      statusLabel:
        healthCounts.offline > 0
          ? "Há projetos sem resposta"
          : healthCounts.degraded > 0
            ? "Há projetos que pedem atenção"
            : healthCounts.unknown > 0
              ? "Há projetos sem sinal"
              : source.projects.length > 0
                ? "Leituras saudáveis"
                : "Sem leitura institucional",
    },
    attention: attentionProjects.map(toAttentionItem),
    activity: {
      items: activity,
      emptyTitle: "Nenhuma atividade nesta instância",
      emptyDescription:
        "Eventos e telemetria vivem na sessão deste processo e ainda não receberam sinais.",
    },
    flow: source.apps.map((app) => ({
      id: app.appId,
      label: app.name,
      relations: app.integrationsCount,
      status: app.enabled ? "available" : "unavailable",
    })),
    nextAction: toNextAction(source.projects),
    origins: [
      {
        id: "registry",
        label: "Registry técnico",
        detail: `${source.apps.length} apps registrados no processo atual`,
        persistence: "process",
        status: "available",
      },
      {
        id: "institutional",
        label: "Snapshot institucional",
        detail: `${source.projects.length} projetos com leitura institucional`,
        persistence: "snapshot",
        updatedAt: source.institutionalUpdatedAt,
        status: source.projects.length ? "available" : "unavailable",
      },
      {
        id: "events",
        label: "EventBus",
        detail: `${source.events.length} eventos nesta sessão`,
        persistence: "session",
        status: source.events.length ? "available" : "waiting",
      },
      {
        id: "telemetry",
        label: "Telemetria",
        detail: `${source.telemetry.length} envelopes nesta sessão`,
        persistence: "session",
        status: source.telemetry.length ? "available" : "waiting",
      },
    ],
  }
}
