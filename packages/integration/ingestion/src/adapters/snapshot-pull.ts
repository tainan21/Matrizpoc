/**
 * SnapshotPullAdapter — ingere snapshots serializados (JSON) de fontes
 * externas. Util para fontes institucionais curadas e legados.
 *
 * O "transporte" do snapshot e injetavel (`fetchSnapshot`): pode ser uma
 * URL HTTPS, um arquivo local, um blob, ou ate um objeto ja em memoria.
 * O adapter nao conhece o transporte — so conhece o SHAPE do snapshot.
 *
 * Shape esperado do snapshot:
 *   { version: "v1", projects: ProjectManifest[] }
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

export interface InstitutionalSnapshotV1 {
  version: "v1"
  projects: ProjectManifest[]
}

export interface SnapshotPullAdapterOptions {
  id: string
  sourceHint: string
  supports?: readonly SourceClassification[]
  fetchSnapshot: (ctx: IngestionContext) => Promise<unknown>
}

const DEFAULT_SUPPORTS: readonly SourceClassification[] = [
  "institutional_source",
  "trusted_external_app",
  "legacy_app",
  "mcp_source",
]

export function createSnapshotPullAdapter(
  opts: SnapshotPullAdapterOptions,
): IngestionAdapter {
  return {
    id: opts.id,
    mode: "snapshot_pull",
    supports: opts.supports ?? DEFAULT_SUPPORTS,
    async ingest(ctx: IngestionContext): Promise<IngestionResult> {
      const started = performance.now()
      const errors: IngestionError[] = []
      const projects: ProjectManifest[] = []
      const ranAt = ctx.now.toISOString()

      let raw: unknown
      try {
        raw = await opts.fetchSnapshot(ctx)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push({ sourceHint: opts.sourceHint, message: `fetch failed: ${message}` })
        ctx.logger.error("snapshot-pull: fetch failed", { source: opts.sourceHint, message })
        return {
          adapterId: opts.id,
          mode: "snapshot_pull",
          projects,
          errors,
          ranAt,
          durationMs: performance.now() - started,
        }
      }

      if (
        !raw ||
        typeof raw !== "object" ||
        (raw as { version?: unknown }).version !== "v1" ||
        !Array.isArray((raw as { projects?: unknown }).projects)
      ) {
        errors.push({
          sourceHint: opts.sourceHint,
          message: "snapshot shape invalid: expected { version: 'v1', projects: [] }",
        })
        return {
          adapterId: opts.id,
          mode: "snapshot_pull",
          projects,
          errors,
          ranAt,
          durationMs: performance.now() - started,
        }
      }

      const payload = raw as InstitutionalSnapshotV1

      payload.projects.forEach((candidate, idx) => {
        const parsed = projectManifestSchema.safeParse(candidate)
        if (parsed.success) {
          projects.push(parsed.data)
        } else {
          const message = parsed.error.issues
            .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
            .join("; ")
          errors.push({
            sourceHint: `${opts.sourceHint}[${idx}]`,
            message,
          })
        }
      })

      return {
        adapterId: opts.id,
        mode: "snapshot_pull",
        projects,
        errors,
        ranAt,
        durationMs: performance.now() - started,
      }
    },
  }
}
