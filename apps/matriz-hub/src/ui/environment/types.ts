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

