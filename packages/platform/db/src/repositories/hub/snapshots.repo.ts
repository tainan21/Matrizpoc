/**
 * Health and public-metrics snapshot repos — time-series per project.
 */
import type { HubPrismaClient } from "../../hub"

export function makeHealthSnapshotRepo(db: HubPrismaClient) {
  return {
    record: (input: {
      projectId: string
      capturedAt: Date
      status: "healthy" | "degraded" | "offline" | "unknown"
      readinessScore: number
      uptimePercent?: number | null
      snapshot: Record<string, unknown>
    }) =>
      db.institutionalHealthSnapshot.create({
        data: {
          projectId: input.projectId,
          capturedAt: input.capturedAt,
          status: input.status,
          readinessScore: input.readinessScore,
          uptimePercent: input.uptimePercent ?? null,
          snapshotJson: input.snapshot as never,
        },
      }),

    latestForProject: (projectId: string) =>
      db.institutionalHealthSnapshot.findFirst({
        where: { projectId },
        orderBy: { capturedAt: "desc" },
      }),

    history: (projectId: string, limit = 50) =>
      db.institutionalHealthSnapshot.findMany({
        where: { projectId },
        orderBy: { capturedAt: "desc" },
        take: limit,
      }),
  }
}

export function makePublicMetricsRepo(db: HubPrismaClient) {
  return {
    record: (input: {
      projectId: string
      capturedAt: Date
      metrics: Record<string, unknown>
    }) =>
      db.institutionalPublicMetricsSnapshot.create({
        data: {
          projectId: input.projectId,
          capturedAt: input.capturedAt,
          metricsJson: input.metrics as never,
        },
      }),

    latestForProject: (projectId: string) =>
      db.institutionalPublicMetricsSnapshot.findFirst({
        where: { projectId },
        orderBy: { capturedAt: "desc" },
      }),
  }
}

export type HealthSnapshotRepo = ReturnType<typeof makeHealthSnapshotRepo>
export type PublicMetricsRepo = ReturnType<typeof makePublicMetricsRepo>
