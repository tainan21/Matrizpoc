/**
 * LocalContractImportAdapter — deriva ProjectManifest institucional a partir
 * de um AppManifestDTO tecnico (V1.1) + metadata institucional do Hub.
 *
 * Este adapter NAO cruza L3: nao le apps/<x>/src. O consumidor (Hub bootstrap)
 * importa apps/<x>/public-contract e passa o AppManifestDTO explicitamente.
 * A metadata institucional (brand, sourceType, trustLevel, tags, ownership,
 * links, health baseline) e injetada via `decorate()`.
 *
 * Supports: internal_monorepo_app.
 */
import type { AppManifestDTO } from "@matriz/integration-api-contracts"
import {
  projectManifestSchema,
  type ProjectBrandIdentity,
  type ProjectHealthSnapshot,
  type ProjectIntegrationCapabilities,
  type ProjectManifest,
  type ProjectMcpCapabilities,
  type ProjectPublicMetrics,
  type ProjectTelemetrySummary,
  type SourceClassification,
  type TrustLevel,
} from "@matriz/integration-api-contracts/v1/institutional"
import type {
  IngestionAdapter,
  IngestionContext,
  IngestionError,
  IngestionResult,
} from "../types"

export interface InstitutionalAppDecoration {
  projectId: `matriz:${string}`
  brand: ProjectBrandIdentity
  trustLevel?: TrustLevel
  institutionalTags?: readonly string[]
  ownership: { owner: string; contact?: string; repo?: string }
  links?: readonly { kind: "docs" | "site" | "app" | "repo" | "status"; url: string; label?: string }[]
  healthBaseline?: Partial<Omit<ProjectHealthSnapshot, "lastCheckAt">>
  metrics?: ProjectPublicMetrics
  telemetry?: ProjectTelemetrySummary
  mcp?: ProjectMcpCapabilities
}

export interface LocalContractImportAdapterOptions {
  id: string
  /**
   * Apps do monorepo a ingerir. Cada entrada carrega o manifest tecnico
   * (vindo do public-contract do app) e uma camada de decoration institucional
   * fornecida pelo Hub.
   */
  apps: readonly {
    manifest: AppManifestDTO
    decoration: InstitutionalAppDecoration
  }[]
}

const DEFAULT_SOURCE_TYPE: SourceClassification = "internal_monorepo_app"
const DEFAULT_TRUST: TrustLevel = "core"

/**
 * Deriva ProjectIntegrationCapabilities a partir do AppManifestDTO tecnico.
 * Faz traducao neutra: eventos produzidos/consumidos -> produces/consumes,
 * routes -> exposes (page), integrations.kind=gateway -> requires(auth).
 */
function deriveCapabilities(m: AppManifestDTO): ProjectIntegrationCapabilities {
  return {
    produces: m.eventsProduced.map((name) => ({ kind: "event", name, version: "v1" })),
    consumes: m.eventsConsumed.map((name) => ({ kind: "event", name, version: "v1" })),
    exposes: m.routes.map((r) => ({ kind: "page", name: r.label, path: r.path })),
    requires: [{ kind: "auth", name: "shared" }],
  }
}

function baselineHealth(
  sourceId: string,
  lastCheckAt: string,
  override?: Partial<Omit<ProjectHealthSnapshot, "lastCheckAt">>,
): ProjectHealthSnapshot {
  const observation = override?.observation ?? {
    sourceId,
    nature: "declared" as const,
    collectedAt: lastCheckAt,
    freshness: "unknown" as const,
    confidence: "unverified" as const,
    lastError: {
      code: "health_not_observed",
      message: "No runtime health check is configured for this project.",
      occurredAt: lastCheckAt,
    },
  }
  const isObserved = observation.nature === "observed"

  return {
    status: isObserved ? (override?.status ?? "unknown") : "unknown",
    readinessScore: isObserved ? (override?.readinessScore ?? 0) : 0,
    lastCheckAt,
    checks: isObserved ? (override?.checks ?? []) : [],
    uptimeWindow: isObserved ? override?.uptimeWindow : undefined,
    uptimePercent: isObserved ? override?.uptimePercent : undefined,
    observation,
  }
}

export function createLocalContractImportAdapter(
  opts: LocalContractImportAdapterOptions,
): IngestionAdapter {
  return {
    id: opts.id,
    mode: "local_contract_import",
    supports: ["internal_monorepo_app"],
    async ingest(ctx: IngestionContext): Promise<IngestionResult> {
      const started = performance.now()
      const errors: IngestionError[] = []
      const projects: ProjectManifest[] = []
      const ranAt = ctx.now.toISOString()

      for (const entry of opts.apps) {
        const m = entry.manifest
        const d = entry.decoration

        const candidate: ProjectManifest = {
          projectId: d.projectId,
          displayName: m.name,
          sourceType: DEFAULT_SOURCE_TYPE,
          trustLevel: d.trustLevel ?? DEFAULT_TRUST,
          ingestMode: "local_contract_import",
          contractVersion: "v1",
          brand: d.brand,
          capabilities: deriveCapabilities(m),
          health: baselineHealth(opts.id, ranAt, d.healthBaseline),
          metrics: d.metrics,
          telemetry: d.telemetry,
          mcp: d.mcp,
          institutionalTags: [...(d.institutionalTags ?? [])],
          ownership: d.ownership,
          links: [...(d.links ?? [])],
          ingestedAt: ranAt,
        }

        const parsed = projectManifestSchema.safeParse(candidate)
        if (parsed.success) {
          projects.push(parsed.data)
        } else {
          const message = parsed.error.issues
            .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
            .join("; ")
          errors.push({ sourceHint: `local:${m.appId}`, message })
          ctx.logger.warn("local-contract-import: invalid derivation", {
            appId: m.appId,
            message,
          })
        }
      }

      return {
        adapterId: opts.id,
        mode: "local_contract_import",
        projects,
        errors,
        ranAt,
        durationMs: performance.now() - started,
      }
    },
  }
}
