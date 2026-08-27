import type { HubPrismaClient } from "@matriz/platform-db/hub"

export function makeProjectRepo(db: HubPrismaClient) {
  return {
    findByProjectId: (projectId: string) => db.institutionalProject.findUnique({ where: { projectId } }),
    listAll: (opts: { sourceType?: string; trustLevel?: string } = {}) => db.institutionalProject.findMany({
      where: { ...(opts.sourceType ? { sourceType: opts.sourceType } : {}), ...(opts.trustLevel ? { trustLevel: opts.trustLevel } : {}) },
      orderBy: { lastSeenAt: "desc" },
    }),
    search: (query: string, limit = 20) => db.institutionalProject.findMany({
      where: { OR: [{ projectId: { contains: query, mode: "insensitive" } }, { institutionalTags: { has: query } }] },
      orderBy: { lastSeenAt: "desc" }, take: limit,
    }),
    upsertFromManifest: async (input: { projectId: string; sourceType: string; trustLevel: string; ingestMode: string; institutionalTags: string[]; manifest: Record<string, unknown>; seenAt?: Date }) => {
      const seen = input.seenAt ?? new Date()
      return db.institutionalProject.upsert({
        where: { projectId: input.projectId },
        create: { projectId: input.projectId, sourceType: input.sourceType, trustLevel: input.trustLevel, ingestMode: input.ingestMode, institutionalTags: input.institutionalTags, manifestJson: input.manifest as never, firstSeenAt: seen, lastSeenAt: seen },
        update: { sourceType: input.sourceType, trustLevel: input.trustLevel, ingestMode: input.ingestMode, institutionalTags: input.institutionalTags, manifestJson: input.manifest as never, lastSeenAt: seen },
      })
    },
  }
}
export type ProjectRepo = ReturnType<typeof makeProjectRepo>
