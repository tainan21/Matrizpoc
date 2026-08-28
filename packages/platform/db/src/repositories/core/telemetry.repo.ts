/**
 * TelemetryRecord Repository — persistent envelope for every telemetry event.
 *
 * V1.3 adds the `category` column so records can be classified as
 * adoption / health / governance / etc. without parsing eventName strings.
 */
import type { CorePrismaClient } from "../../core"

export function makeTelemetryRepo(db: CorePrismaClient) {
  return {
    record: (input: {
      tenantId: string
      appId: string
      eventName: string
      eventVersion?: string
      category?: string | null
      properties?: Record<string, unknown> | null
      occurredAt?: Date
    }) =>
      db.telemetryRecord.create({
        data: {
          tenantId: input.tenantId,
          appId: input.appId,
          eventName: input.eventName,
          eventVersion: input.eventVersion ?? "v1",
          category: input.category ?? null,
          properties: (input.properties ?? null) as never,
          occurredAt: input.occurredAt ?? new Date(),
        },
      }),

    recordBatch: (events: readonly {
      sourceEventId: string
      tenantId: string
      appId: string
      eventName: string
      eventVersion: string
      category?: string | null
      properties: Record<string, unknown>
      occurredAt: Date
    }[]) => db.telemetryRecord.createMany({
      data: events.map((event) => ({
        sourceEventId: event.sourceEventId,
        tenantId: event.tenantId,
        appId: event.appId,
        eventName: event.eventName,
        eventVersion: event.eventVersion,
        category: event.category ?? null,
        properties: event.properties as never,
        occurredAt: event.occurredAt,
      })),
      skipDuplicates: true,
    }),

    countByCategory: (tenantId: string, since: Date) =>
      db.telemetryRecord.groupBy({
        by: ["category"],
        where: { tenantId, occurredAt: { gte: since } },
        _count: true,
      }),

    listRecent: (tenantId: string, limit = 50) =>
      db.telemetryRecord.findMany({
        where: { tenantId },
        orderBy: { occurredAt: "desc" },
        take: limit,
      }),
  }
}

export type TelemetryRepo = ReturnType<typeof makeTelemetryRepo>
