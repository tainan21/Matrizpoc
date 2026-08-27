import type { HubPrismaClient } from "@matriz/platform-db/hub"

export function makeSourceRepo(db: HubPrismaClient) {
  return {
    findBySourceId: (sourceId: string) => db.institutionalSource.findUnique({ where: { sourceId } }),
    list: () => db.institutionalSource.findMany({ orderBy: { createdAt: "asc" } }),
    ensure: (input: { sourceId: string; sourceType: string; ingestMode: string; displayName: string; metadata?: Record<string, unknown> | null }) => db.institutionalSource.upsert({
      where: { sourceId: input.sourceId },
      create: { sourceId: input.sourceId, sourceType: input.sourceType, ingestMode: input.ingestMode, displayName: input.displayName, metadata: (input.metadata ?? null) as never },
      update: { sourceType: input.sourceType, ingestMode: input.ingestMode, displayName: input.displayName, ...(input.metadata !== undefined ? { metadata: (input.metadata ?? null) as never } : {}) },
    }),
  }
}
export type SourceRepo = ReturnType<typeof makeSourceRepo>
