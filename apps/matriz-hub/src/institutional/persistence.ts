/**
 * Institutional persistence adapter (Hub-side, V1.3).
 *
 * Converts an IngestionPipelineRun into real DB rows in the hub schema:
 *   - InstitutionalSource  (one per adapter)
 *   - InstitutionalIngestionRun (one per execution)
 *   - InstitutionalProject (upserted from each produced manifest)
 *
 * Idempotent: re-running persists a new IngestionRun row but upserts
 * projects — `firstSeenAt` is preserved, `lastSeenAt` bumps.
 *
 * This is where "Hub is a real control plane" stops being a claim.
 */
import { getHubDb } from "@matriz/platform-db/hub"
import {
  makeIngestionRunRepo,
  makeProjectRepo,
  makeSourceRepo,
} from "../integration/prisma/repositories"
import type { IngestionPipelineRun } from "@matriz/integration-ingestion"
import type { ProjectManifest } from "@matriz/integration-api-contracts/v1/institutional"

/**
 * Persist a full pipeline run. Returns an audit summary usable by MCP tools.
 */
export async function persistIngestionRun(
  run: IngestionPipelineRun,
): Promise<{
  sourcesUpserted: number
  runsRecorded: number
  projectsUpserted: number
}> {
  const db = getHubDb()
  const sources = makeSourceRepo(db)
  const runs = makeIngestionRunRepo(db)
  const projects = makeProjectRepo(db)

  let sourcesUpserted = 0
  let runsRecorded = 0
  let projectsUpserted = 0

  const seenAt = new Date()

  // 1. Ensure source rows exist, one per adapter result, then record the run.
  for (const adapterResult of run.byAdapter) {
    const source = await sources.ensure({
      sourceId: adapterResult.adapterId,
      sourceType: adapterResult.mode,
      ingestMode: adapterResult.mode,
      displayName: adapterResult.adapterId,
    })
    sourcesUpserted++

    const adapterErrors = run.errors
      .filter((e) => e.adapterId === adapterResult.adapterId)
      .map((e) => ({
        code: "ingestion_error",
        message: e.message,
        projectId: e.sourceHint,
      }))

    await runs.record({
      sourceId: source.id,
      startedAt: new Date(run.startedAt),
      finishedAt: new Date(run.finishedAt),
      accepted: adapterResult.projects.length,
      rejected: adapterErrors.length,
      errors: adapterErrors,
      report: {
        adapterId: adapterResult.adapterId,
        mode: adapterResult.mode,
        projectIds: adapterResult.projects.map((p) => p.projectId),
        errors: adapterErrors,
      },
    })
    runsRecorded++
  }

  // 2. Upsert every project produced by the pipeline.
  for (const manifest of run.projects) {
    await projects.upsertFromManifest(projectManifestToUpsert(manifest, seenAt))
    projectsUpserted++
  }

  return { sourcesUpserted, runsRecorded, projectsUpserted }
}

function projectManifestToUpsert(manifest: ProjectManifest, seenAt: Date) {
  return {
    projectId: manifest.projectId,
    sourceType: manifest.sourceType,
    trustLevel: manifest.trustLevel,
    ingestMode: manifest.ingestMode,
    institutionalTags: Array.from(manifest.institutionalTags ?? []),
    manifest: manifest as unknown as Record<string, unknown>,
    seenAt,
  }
}
