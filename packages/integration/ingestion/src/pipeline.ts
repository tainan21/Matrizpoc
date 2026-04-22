/**
 * Ingestion pipeline.
 *
 * Recebe uma lista de adapters e um contexto, executa cada um e consolida
 * os ProjectManifest produzidos. Isola erros por adapter: falha em um nao
 * invalida os outros.
 *
 * Nao conhece Registry institucional. O consumidor (Hub bootstrap) pega o
 * resultado e faz o swap atomico no registry.
 */
import type {
  IngestionMode,
  ProjectManifest,
} from "@matriz/integration-api-contracts/v1/institutional"
import type {
  IngestionAdapter,
  IngestionContext,
  IngestionError,
  IngestionResult,
} from "./types"

export interface IngestionPipelineRun {
  startedAt: string
  finishedAt: string
  durationMs: number
  byAdapter: IngestionResult[]
  projects: ProjectManifest[]
  errors: (IngestionError & { adapterId: string; mode: IngestionMode })[]
}

export interface IngestionPipeline {
  readonly adapters: readonly IngestionAdapter[]
  run(ctx?: Partial<IngestionContext>): Promise<IngestionPipelineRun>
}

export interface CreatePipelineOptions {
  adapters: readonly IngestionAdapter[]
  logger?: IngestionContext["logger"]
  fetchJson?: IngestionContext["fetchJson"]
}

const NOOP_LOGGER: IngestionContext["logger"] = {
  info: () => {},
  warn: () => {},
  error: () => {},
}

export function createIngestionPipeline(
  opts: CreatePipelineOptions,
): IngestionPipeline {
  return {
    adapters: opts.adapters,
    async run(ctxOverride) {
      const startedIso = new Date().toISOString()
      const started = performance.now()

      const ctx: IngestionContext = {
        now: ctxOverride?.now ?? new Date(),
        logger: ctxOverride?.logger ?? opts.logger ?? NOOP_LOGGER,
        fetchJson: ctxOverride?.fetchJson ?? opts.fetchJson,
      }

      const byAdapter: IngestionResult[] = []
      const projects: ProjectManifest[] = []
      const errors: IngestionPipelineRun["errors"] = []

      for (const adapter of opts.adapters) {
        try {
          const r = await adapter.ingest(ctx)
          byAdapter.push(r)
          projects.push(...r.projects)
          for (const e of r.errors) {
            errors.push({ ...e, adapterId: r.adapterId, mode: r.mode })
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          errors.push({
            adapterId: adapter.id,
            mode: adapter.mode,
            sourceHint: `adapter:${adapter.id}`,
            message,
          })
          ctx.logger.error("ingestion pipeline: adapter threw", {
            adapterId: adapter.id,
            mode: adapter.mode,
            message,
          })
        }
      }

      return {
        startedAt: startedIso,
        finishedAt: new Date().toISOString(),
        durationMs: performance.now() - started,
        byAdapter,
        projects,
        errors,
      }
    },
  }
}
