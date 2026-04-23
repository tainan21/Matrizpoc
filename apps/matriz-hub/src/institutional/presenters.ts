/**
 * Institutional presenters (L6 view-models).
 *
 * Convertem o ProjectManifest bruto em read-models prontos para UI. A UI
 * nao acessa schemas Zod nem registry diretamente: consome view-models daqui.
 */
import type {
  HealthStatus,
  ProjectManifest,
  SourceClassification,
  TrustLevel,
} from "@matriz/integration-api-contracts/v1/institutional"
import type { InstitutionalRegistryStats } from "@matriz/integration-registry-core/institutional"

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger"

export interface ProjectListItemVM {
  projectId: string
  displayName: string
  tagline?: string
  brandPrimaryColor: string
  brandAccentColor?: string
  logoText: string
  sourceTypeLabel: string
  sourceType: SourceClassification
  trustLevelLabel: string
  trustLevel: TrustLevel
  trustTone: BadgeTone
  ingestModeLabel: string
  healthLabel: string
  healthStatus: HealthStatus
  healthTone: BadgeTone
  readinessScore: number
  tags: readonly string[]
  isPublic: boolean
}

export interface ProjectDetailVM extends ProjectListItemVM {
  description?: string
  owner: string
  contact?: string
  repo?: string
  links: ReadonlyArray<{ kind: string; url: string; label?: string }>
  lastCheckAt: string
  checks: ReadonlyArray<{ name: string; status: string; detail?: string; tone: BadgeTone }>
  uptimeWindow?: string
  uptimePercent?: number
  capabilities: {
    produces: ReadonlyArray<{ kind: string; name: string; version?: string }>
    consumes: ReadonlyArray<{ kind: string; name: string; version?: string }>
    exposes: ReadonlyArray<{ kind: string; name: string; path?: string }>
    requires: ReadonlyArray<{ kind: string; name: string }>
  }
  metrics?: {
    activeUsers?: number
    reach?: number
    publishedItems?: number
    lastActivityAt?: string
    customMetrics: ReadonlyArray<{ key: string; label: string; value: number; unit?: string }>
  }
  ingestedAt: string
}

export interface HealthOverviewVM {
  totalProjects: number
  healthyCount: number
  degradedCount: number
  offlineCount: number
  unknownCount: number
  avgReadinessScore: number
  projects: ReadonlyArray<{
    projectId: string
    displayName: string
    healthStatus: HealthStatus
    healthTone: BadgeTone
    healthLabel: string
    readinessScore: number
    lastCheckAt: string
    brandAccentColor?: string
    failedCheckCount: number
  }>
}

export interface EcosystemEdgeVM {
  from: string
  to: string
  kind: string
  name: string
}

export interface EcosystemVM {
  produces: ReadonlyArray<EcosystemEdgeVM>
  consumes: ReadonlyArray<EcosystemEdgeVM>
  sharedEvents: ReadonlyArray<{
    eventName: string
    producers: readonly string[]
    consumers: readonly string[]
  }>
  sourceDistribution: Record<SourceClassification, number>
  trustDistribution: Record<TrustLevel, number>
}

// --------------------- helpers ------------------------

const SOURCE_LABELS: Record<SourceClassification, string> = {
  internal_monorepo_app: "App interno",
  trusted_external_app: "Externo confiavel",
  legacy_app: "Legado",
  third_party_service: "Terceiro",
  mcp_source: "Fonte MCP",
  institutional_source: "Fonte institucional",
}

const TRUST_LABELS: Record<TrustLevel, string> = {
  core: "Core",
  trusted: "Confiavel",
  external: "Externo",
  experimental: "Experimental",
  unknown: "Desconhecido",
}

const TRUST_TONES: Record<TrustLevel, BadgeTone> = {
  core: "brand",
  trusted: "success",
  external: "neutral",
  experimental: "warning",
  unknown: "neutral",
}

const HEALTH_LABELS: Record<HealthStatus, string> = {
  healthy: "Saudavel",
  degraded: "Degradado",
  offline: "Offline",
  unknown: "Desconhecido",
}

const HEALTH_TONES: Record<HealthStatus, BadgeTone> = {
  healthy: "success",
  degraded: "warning",
  offline: "danger",
  unknown: "neutral",
}

const INGEST_LABELS: Record<string, string> = {
  static_seed: "Seed estatica",
  local_contract_import: "Import local",
  snapshot_pull: "Pull de snapshot",
  api_pull: "API pull",
  webhook_push: "Webhook push",
  manual_registration: "Manual",
}

const CHECK_TONES: Record<string, BadgeTone> = {
  pass: "success",
  warn: "warning",
  fail: "danger",
}

function isProjectPublic(p: ProjectManifest): boolean {
  if (p.trustLevel === "core" || p.trustLevel === "trusted") return true
  if (p.trustLevel === "external") return p.institutionalTags.includes("public")
  return false
}

function logoFromBrand(p: ProjectManifest): string {
  if (p.brand.logoText) return p.brand.logoText
  return p.displayName
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

// --------------------- presenters ------------------------

export function toProjectListItemVM(p: ProjectManifest): ProjectListItemVM {
  return {
    projectId: p.projectId,
    displayName: p.displayName,
    tagline: p.brand.tagline,
    brandPrimaryColor: p.brand.primaryColor,
    brandAccentColor: p.brand.accentColor,
    logoText: logoFromBrand(p),
    sourceType: p.sourceType,
    sourceTypeLabel: SOURCE_LABELS[p.sourceType],
    trustLevel: p.trustLevel,
    trustLevelLabel: TRUST_LABELS[p.trustLevel],
    trustTone: TRUST_TONES[p.trustLevel],
    ingestModeLabel: INGEST_LABELS[p.ingestMode] ?? p.ingestMode,
    healthStatus: p.health.status,
    healthLabel: HEALTH_LABELS[p.health.status],
    healthTone: HEALTH_TONES[p.health.status],
    readinessScore: p.health.readinessScore,
    tags: p.institutionalTags,
    isPublic: isProjectPublic(p),
  }
}

export function toProjectDetailVM(p: ProjectManifest): ProjectDetailVM {
  const base = toProjectListItemVM(p)
  return {
    ...base,
    owner: p.ownership.owner,
    contact: p.ownership.contact,
    repo: p.ownership.repo,
    links: p.links,
    lastCheckAt: p.health.lastCheckAt,
    checks: p.health.checks.map((c) => ({
      name: c.name,
      status: c.status,
      detail: c.detail,
      tone: CHECK_TONES[c.status] ?? "neutral",
    })),
    uptimeWindow: p.health.uptimeWindow,
    uptimePercent: p.health.uptimePercent,
    capabilities: {
      produces: p.capabilities.produces,
      consumes: p.capabilities.consumes,
      exposes: p.capabilities.exposes,
      requires: p.capabilities.requires,
    },
    metrics: p.metrics
      ? {
          activeUsers: p.metrics.activeUsers,
          reach: p.metrics.reach,
          publishedItems: p.metrics.publishedItems,
          lastActivityAt: p.metrics.lastActivityAt,
          customMetrics: p.metrics.customMetrics,
        }
      : undefined,
    ingestedAt: p.ingestedAt,
  }
}

export function toHealthOverviewVM(
  projects: readonly ProjectManifest[],
  stats: InstitutionalRegistryStats,
): HealthOverviewVM {
  return {
    totalProjects: stats.total,
    healthyCount: stats.byHealthStatus.healthy,
    degradedCount: stats.byHealthStatus.degraded,
    offlineCount: stats.byHealthStatus.offline,
    unknownCount: stats.byHealthStatus.unknown,
    avgReadinessScore: stats.avgReadinessScore,
    projects: projects
      .slice()
      .sort((a, b) => a.health.readinessScore - b.health.readinessScore)
      .map((p) => ({
        projectId: p.projectId,
        displayName: p.displayName,
        healthStatus: p.health.status,
        healthTone: HEALTH_TONES[p.health.status],
        healthLabel: HEALTH_LABELS[p.health.status],
        readinessScore: p.health.readinessScore,
        lastCheckAt: p.health.lastCheckAt,
        brandAccentColor: p.brand.accentColor,
        failedCheckCount: p.health.checks.filter((c) => c.status !== "pass").length,
      })),
  }
}

export function toEcosystemVM(
  projects: readonly ProjectManifest[],
  stats: InstitutionalRegistryStats,
): EcosystemVM {
  const produces: EcosystemEdgeVM[] = []
  const consumes: EcosystemEdgeVM[] = []
  const eventMap = new Map<string, { producers: Set<string>; consumers: Set<string> }>()

  for (const p of projects) {
    for (const pt of p.capabilities.produces) {
      produces.push({ from: p.projectId, to: pt.name, kind: pt.kind, name: pt.name })
      if (pt.kind === "event") {
        const entry = eventMap.get(pt.name) ?? { producers: new Set(), consumers: new Set() }
        entry.producers.add(p.projectId)
        eventMap.set(pt.name, entry)
      }
    }
    for (const pt of p.capabilities.consumes) {
      consumes.push({ from: pt.name, to: p.projectId, kind: pt.kind, name: pt.name })
      if (pt.kind === "event") {
        const entry = eventMap.get(pt.name) ?? { producers: new Set(), consumers: new Set() }
        entry.consumers.add(p.projectId)
        eventMap.set(pt.name, entry)
      }
    }
  }

  const sharedEvents = Array.from(eventMap.entries())
    .filter(([, v]) => v.producers.size > 0 && v.consumers.size > 0)
    .map(([eventName, v]) => ({
      eventName,
      producers: Array.from(v.producers),
      consumers: Array.from(v.consumers),
    }))

  return {
    produces,
    consumes,
    sharedEvents,
    sourceDistribution: stats.bySourceType,
    trustDistribution: stats.byTrustLevel,
  }
}

export const HEALTH_TONE_MAP = HEALTH_TONES
export const TRUST_TONE_MAP = TRUST_TONES
