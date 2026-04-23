/**
 * InstitutionalRegistry (V1.2).
 *
 * Coexiste com o Registry tecnico (V1.1, `createRegistry`). Opera sobre
 * ProjectManifest (camada institucional) em vez de AppManifestDTO.
 *
 * - Swap atomico: `replaceAll(projects)` substitui o conteudo inteiro de
 *   forma atomica, evitando estados intermediarios inconsistentes durante
 *   um refresh.
 * - Domain-free: opera apenas sobre categorias institucionais.
 */
import {
  projectManifestSchema,
  type HealthStatus,
  type ProjectManifest,
  type ProjectId,
  type SourceClassification,
  type TrustLevel,
} from "@matriz/integration-api-contracts/v1/institutional"

export interface InstitutionalRegistryReplaceResult {
  accepted: number
  rejected: { projectIdHint: string; message: string }[]
  replacedAt: string
}

export interface InstitutionalRegistryStats {
  total: number
  bySourceType: Record<SourceClassification, number>
  byTrustLevel: Record<TrustLevel, number>
  byHealthStatus: Record<HealthStatus, number>
  avgReadinessScore: number
}

export interface InstitutionalRegistry {
  replaceAll(projects: readonly ProjectManifest[]): InstitutionalRegistryReplaceResult
  list(): readonly ProjectManifest[]
  get(projectId: ProjectId): ProjectManifest | undefined
  findBySourceType(sourceType: SourceClassification): readonly ProjectManifest[]
  findByTrustLevel(trustLevel: TrustLevel): readonly ProjectManifest[]
  findByHealthStatus(status: HealthStatus): readonly ProjectManifest[]
  findByTag(tag: string): readonly ProjectManifest[]
  publicView(): readonly ProjectManifest[]
  stats(): InstitutionalRegistryStats
  lastReplacedAt(): string | undefined
}

const EMPTY_COUNTS_BY_SOURCE: Record<SourceClassification, number> = {
  internal_monorepo_app: 0,
  trusted_external_app: 0,
  legacy_app: 0,
  third_party_service: 0,
  mcp_source: 0,
  institutional_source: 0,
}

const EMPTY_COUNTS_BY_TRUST: Record<TrustLevel, number> = {
  core: 0,
  trusted: 0,
  external: 0,
  experimental: 0,
  unknown: 0,
}

const EMPTY_COUNTS_BY_HEALTH: Record<HealthStatus, number> = {
  healthy: 0,
  degraded: 0,
  offline: 0,
  unknown: 0,
}

/**
 * Criterios de visibilidade publica, espelhando docs/source-classification.md:
 *   - core e trusted: sempre
 *   - external: somente se tag "public"
 *   - experimental e unknown: nunca
 */
function isPublic(p: ProjectManifest): boolean {
  if (p.trustLevel === "core" || p.trustLevel === "trusted") return true
  if (p.trustLevel === "external") return p.institutionalTags.includes("public")
  return false
}

export function createInstitutionalRegistry(): InstitutionalRegistry {
  let entries = new Map<ProjectId, ProjectManifest>()
  let lastReplaced: string | undefined

  return {
    replaceAll(projects) {
      const accepted = new Map<ProjectId, ProjectManifest>()
      const rejected: InstitutionalRegistryReplaceResult["rejected"] = []

      for (const candidate of projects) {
        const parsed = projectManifestSchema.safeParse(candidate)
        if (parsed.success) {
          accepted.set(parsed.data.projectId, parsed.data)
        } else {
          const message = parsed.error.issues
            .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
            .join("; ")
          rejected.push({
            projectIdHint:
              (candidate as { projectId?: string }).projectId ?? "<unknown>",
            message,
          })
        }
      }

      entries = accepted
      lastReplaced = new Date().toISOString()

      return {
        accepted: accepted.size,
        rejected,
        replacedAt: lastReplaced,
      }
    },
    list() {
      return Array.from(entries.values())
    },
    get(projectId) {
      return entries.get(projectId)
    },
    findBySourceType(sourceType) {
      return Array.from(entries.values()).filter((p) => p.sourceType === sourceType)
    },
    findByTrustLevel(trustLevel) {
      return Array.from(entries.values()).filter((p) => p.trustLevel === trustLevel)
    },
    findByHealthStatus(status) {
      return Array.from(entries.values()).filter((p) => p.health.status === status)
    },
    findByTag(tag) {
      return Array.from(entries.values()).filter((p) => p.institutionalTags.includes(tag))
    },
    publicView() {
      return Array.from(entries.values()).filter(isPublic)
    },
    stats() {
      const all = Array.from(entries.values())
      const bySourceType = { ...EMPTY_COUNTS_BY_SOURCE }
      const byTrustLevel = { ...EMPTY_COUNTS_BY_TRUST }
      const byHealthStatus = { ...EMPTY_COUNTS_BY_HEALTH }
      let readinessSum = 0

      for (const p of all) {
        bySourceType[p.sourceType] += 1
        byTrustLevel[p.trustLevel] += 1
        byHealthStatus[p.health.status] += 1
        readinessSum += p.health.readinessScore
      }

      return {
        total: all.length,
        bySourceType,
        byTrustLevel,
        byHealthStatus,
        avgReadinessScore: all.length === 0 ? 0 : Math.round(readinessSum / all.length),
      }
    },
    lastReplacedAt() {
      return lastReplaced
    },
  }
}

// ---------- singleton helper (mirror of createRegistry) ----------

const GLOBAL_KEY = Symbol.for("matriz.integration.institutional-registry")
type Globals = { [K: symbol]: InstitutionalRegistry | undefined }
const globals = globalThis as unknown as Globals

export function getGlobalInstitutionalRegistry(): InstitutionalRegistry {
  if (!globals[GLOBAL_KEY]) {
    globals[GLOBAL_KEY] = createInstitutionalRegistry()
  }
  return globals[GLOBAL_KEY]!
}

export const INSTITUTIONAL_REGISTRY_VERSION = "1.0.0" as const
