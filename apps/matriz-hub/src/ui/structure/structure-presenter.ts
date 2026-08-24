import type { HubStatus } from "../environment/types"

export type StructureHealth = "healthy" | "degraded" | "offline" | "unknown"

export interface StructureStateVM {
  readonly status: HubStatus
  readonly label: string
  readonly priority: number
}

const HEALTH_STATES: Record<StructureHealth, StructureStateVM> = {
  offline: { status: "blocked", label: "Sem resposta", priority: 0 },
  degraded: { status: "attention", label: "Requer atenção", priority: 1 },
  unknown: { status: "unknown", label: "Sem sinal", priority: 2 },
  healthy: { status: "complete", label: "Saudável", priority: 3 },
}

export function presentHealthState(health: StructureHealth): StructureStateVM {
  return HEALTH_STATES[health]
}

export interface ProjectPortfolioSource {
  readonly projectId: string
  readonly displayName: string
  readonly sourceTypeLabel: string
  readonly sourceType: string
  readonly trustLevelLabel: string
  readonly trustLevel: string
  readonly healthStatus: StructureHealth
  readonly readinessScore: number
  readonly lastCheckAt: string
  readonly accentColor?: string
  readonly tagline?: string
}

export interface ProjectPortfolioVM extends ProjectPortfolioSource {
  readonly status: HubStatus
  readonly statusLabel: string
  readonly href: string
}

export function presentProjectPortfolio(
  projects: readonly ProjectPortfolioSource[],
): readonly ProjectPortfolioVM[] {
  return projects
    .map((project) => {
      const state = presentHealthState(project.healthStatus)
      return {
        ...project,
        status: state.status,
        statusLabel: state.label,
        href: `/projects/${encodeURIComponent(project.projectId)}`,
      }
    })
    .sort((left, right) => {
      const severity =
        presentHealthState(left.healthStatus).priority -
        presentHealthState(right.healthStatus).priority
      return severity || left.readinessScore - right.readinessScore
    })
}

export interface AppContractSource {
  readonly appId: string
  readonly name: string
  readonly description: string
  readonly version: string
  readonly contractVersion: string
  readonly baseUrl: string
  readonly enabled: boolean
  readonly routes: readonly { readonly label: string; readonly path: string }[]
  readonly capabilities: readonly {
    readonly id: string
    readonly name: string
    readonly description: string
  }[]
  readonly eventsProduced: readonly string[]
  readonly eventsConsumed: readonly string[]
  readonly integrationsCount: number
  readonly domainSummary: string
}

export interface AppContractVM extends Omit<AppContractSource, "capabilities"> {
  readonly status: HubStatus
  readonly statusLabel: string
  readonly relationsCount: number
  readonly capabilities: readonly {
    readonly technicalLabel: string
    readonly label: string
    readonly description: string
  }[]
}

export function presentAppContract(source: AppContractSource): AppContractVM {
  return {
    ...source,
    status: source.enabled ? "available" : "unavailable",
    statusLabel: source.enabled ? "Disponível" : "Indisponível",
    relationsCount: source.integrationsCount,
    capabilities: source.capabilities.map((capability) => ({
      technicalLabel: capability.id,
      label: capability.name,
      description: capability.description,
    })),
  }
}
