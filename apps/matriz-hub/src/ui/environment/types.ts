export type HubStatus =
  | "available"
  | "running"
  | "waiting"
  | "attention"
  | "approval"
  | "blocked"
  | "complete"
  | "failed"
  | "temporary"
  | "official"
  | "archived"
  | "planned"
  | "unavailable"
  | "unknown"

export type HubIconName =
  | "overview"
  | "project"
  | "health"
  | "architecture"
  | "registry"
  | "ecosystem"
  | "link"
  | "event"
  | "telemetry"
  | "onboarding"
  | "flag"
  | "docs"
  | "review"
  | "context"
  | "graph"
  | "timeline"
  | "tool"
  | "roadmap"
  | "agent"
  | "release"
  | "audit"
  | "search"
  | "menu"
  | "close"
  | "chevron"
  | "activity"
  | "user"
  | "logout"
  | "command"
  | "warning"
  | "check"
  | "database"
  | "layers"

export interface HubNavItem {
  readonly label: string
  readonly href: string
  readonly description: string
  readonly icon: HubIconName
  readonly keywords?: readonly string[]
}

export interface HubNavGroup {
  readonly id: string
  readonly label: string
  readonly items: readonly HubNavItem[]
}

export interface HubCommandItem extends HubNavItem {
  readonly groupLabel: string
  readonly searchableText: string
}

export type HubProjectHealth = "healthy" | "degraded" | "offline" | "unknown"

export interface HubPortfolioItemVM {
  readonly appId: string
  readonly name: string
  readonly description: string
  readonly status: HubStatus
  readonly statusLabel: string
  readonly readinessScore?: number
  readonly capabilitiesCount: number
  readonly routesCount: number
  readonly accentColor?: string
  readonly href: string
}

export interface HubHealthSummaryVM {
  readonly total: number
  readonly healthy: number
  readonly degraded: number
  readonly offline: number
  readonly unknown: number
  readonly averageReadiness: number
  readonly status: HubStatus
  readonly statusLabel: string
}

export interface HubAttentionItemVM {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly status: HubStatus
  readonly statusLabel: string
  readonly href: string
}

export interface HubActivityItemVM {
  readonly id: string
  readonly kind: "event" | "telemetry"
  readonly label: string
  readonly source: string
  readonly occurredAt: string
  readonly status: HubStatus
}

export interface HubActivityStreamVM {
  readonly items: readonly HubActivityItemVM[]
  readonly emptyTitle: string
  readonly emptyDescription: string
}

export interface HubFlowNodeVM {
  readonly id: string
  readonly label: string
  readonly relations: number
  readonly status: HubStatus
}

export interface HubActionVM {
  readonly label: string
  readonly technicalLabel: string
  readonly description: string
  readonly consequence: string
  readonly href: string
  readonly status: HubStatus
}

export type HubDataPersistence = "process" | "snapshot" | "session" | "persisted" | "local"

export interface HubDataOriginVM {
  readonly id: string
  readonly label: string
  readonly detail: string
  readonly persistence: HubDataPersistence
  readonly updatedAt?: string
  readonly status: HubStatus
}

export interface HubGraphNodeVM {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly version: string
  readonly status: HubStatus
  readonly statusLabel: string
  readonly accentColor?: string
  readonly readinessScore?: number
  readonly capabilitiesCount: number
  readonly routesCount: number
  readonly integrationsCount: number
  readonly lastCheckAt?: string
  readonly href: string
}

export interface HubGraphEdgeVM {
  readonly id: string
  readonly sourceId: string
  readonly targetId: string
  readonly kind: string
  readonly status: HubStatus
}

export interface HubRecentChangeVM {
  readonly id: string
  readonly label: string
  readonly actor: string
  readonly occurredAt: string
  readonly status: HubStatus
}

export interface HubRecentActorVM {
  readonly id: string
  readonly label: string
  readonly activityCount: number
  readonly lastSeenAt: string
  readonly status: "archived"
}

export interface HubOverviewVM {
  readonly generatedAt: string
  readonly graph: {
    readonly nodes: readonly HubGraphNodeVM[]
    readonly edges: readonly HubGraphEdgeVM[]
    readonly defaultSelectedId?: string
  }
  readonly portfolio: readonly HubPortfolioItemVM[]
  readonly health: HubHealthSummaryVM
  readonly attention: readonly HubAttentionItemVM[]
  readonly activity: HubActivityStreamVM
  readonly flow: readonly HubFlowNodeVM[]
  readonly nextAction: HubActionVM
  readonly origins: readonly HubDataOriginVM[]
  readonly changes: readonly HubRecentChangeVM[]
  readonly actors: readonly HubRecentActorVM[]
}
