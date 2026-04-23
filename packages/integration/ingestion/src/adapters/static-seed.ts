/**
 * StaticSeedAdapter — ingere ProjectManifest declarados inline (TS/JSON).
 *
 * Util para bootstrapping e cenarios conceituais (ex.: listar um terceiro
 * conhecido). Supports: qualquer sourceType.
 */
import {
  projectManifestSchema,
  type ProjectManifest,
  type SourceClassification,
} from "@matriz/integration-api-contracts/v1/institutional"
import type {
  IngestionAdapter,
  IngestionContext,
  IngestionError,
  IngestionResult,
} from "../types"

export interface StaticSeedAdapterOptions {
  id: string
  supports?: readonly SourceClassification[]
  seeds: readonly ProjectManifest[]
}

const ALL_SOURCES: readonly SourceClassification[] = [
  "internal_monorepo_app",
  "trusted_external_app",
  "legacy_app",
  "third_party_service",
  "mcp_source",
  "institutional_source",
]

export function createStaticSeedAdapter(
  opts: StaticSeedAdapterOptions,
): IngestionAdapter {
  return {
    id: opts.id,
    mode: "static_seed",
    supports: opts.supports ?? ALL_SOURCES,
    async ingest(ctx: IngestionContext): Promise<IngestionResult> {
      const started = performance.now()
      const errors: IngestionError[] = []
      const projects: ProjectManifest[] = []

      for (const raw of opts.seeds) {
        const parsed = projectManifestSchema.safeParse(raw)
        if (parsed.success) {
          projects.push(parsed.data)
        } else {
          const message = parsed.error.issues
            .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
            .join("; ")
          errors.push({ sourceHint: `seed:${raw.projectId ?? "<no-id>"}`, message })
          ctx.logger.warn("static-seed: invalid seed rejected", { id: raw.projectId, message })
        }
      }

      return {
        adapterId: opts.id,
        mode: "static_seed",
        projects,
        errors,
        ranAt: ctx.now.toISOString(),
        durationMs: performance.now() - started,
      }
    },
  }
}
