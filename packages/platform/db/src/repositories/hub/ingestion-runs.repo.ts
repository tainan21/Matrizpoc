/**
 * InstitutionalIngestionRun Repository — append-only audit of pipeline runs.
 *
 * The full IngestionPipelineRun contract is stored in `reportJson` so we can
 * replay it or rehydrate the DTO without schema migrations.
 */
import type { HubPrismaClient } from "../../hub"

export function makeIngestionRunRepo(db: HubPrismaClient) {
  return {
    record: (input: {
      sourceId: string // FK to InstitutionalSource.id
      startedAt: Date
      finishedAt: Date
      accepted: number
      rejected: number
      errors?: Array<{ code: string; message: string; projectId?: string }>
      report: Record<string, unknown>
    }) =>
      db.institutionalIngestionRun.create({
        data: {
          sourceId: input.sourceId,
          startedAt: input.startedAt,
          finishedAt: input.finishedAt,
          durationMs: Math.max(
            0,
            input.finishedAt.getTime() - input.startedAt.getTime(),
          ),
          accepted: input.accepted,
          rejected: input.rejected,
          errorsJson: (input.errors ?? []) as never,
          reportJson: input.report as never,
        },
      }),

    listBySource: (sourceId: string, limit = 20) =>
      db.institutionalIngestionRun.findMany({
        where: { sourceId },
        orderBy: { startedAt: "desc" },
        take: limit,
      }),

    latest: (limit = 10) =>
      db.institutionalIngestionRun.findMany({
        orderBy: { startedAt: "desc" },
        take: limit,
        include: { source: true },
      }),
  }
}

export type IngestionRunRepo = ReturnType<typeof makeIngestionRunRepo>
