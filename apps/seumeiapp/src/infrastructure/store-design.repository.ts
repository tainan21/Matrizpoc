import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import type { StoreDesignDraftRecord, StoreDesignRepository, StorePublicationVersionRecord } from "../domain/repositories/store-design-repository"
import { validateStoreIdentityDraft, type StoreIdentityPresetId } from "../domain/store-identity"

export class StoreDesignUnavailableError extends Error { constructor() { super("Loja indisponível para esta empresa"); this.name = "StoreDesignUnavailableError" } }
export class StoreDesignConflictError extends Error { constructor() { super("A identidade visual foi atualizada em outra sessão"); this.name = "StoreDesignConflictError" } }

function version(row: any): StorePublicationVersionRecord {
  return { id: row.id, tenantId: row.tenantId, publicationId: row.publicationId, version: row.version, storeSlug: row.storeSlug, displayName: row.displayName, preset: row.preset as StoreIdentityPresetId, headline: row.headline, announcement: row.announcement, description: row.description, heroImageUrl: row.heroImageUrl, publishedByUserId: row.publishedByUserId, publishedAt: row.publishedAt.toISOString() }
}

function draft(row: any): StoreDesignDraftRecord {
  return { publicationId: row.id, tenantId: row.tenantId, companyId: row.companyId, storeSlug: row.storeSlug, displayName: row.displayName, preset: row.draftPreset as StoreIdentityPresetId, headline: row.draftHeadline, announcement: row.draftAnnouncement, description: row.draftDescription, heroImageUrl: row.draftHeroImageUrl, draftVersion: row.draftVersion, isPublished: row.isPublished, publishedVersion: row.publishedVersion ? version(row.publishedVersion) : null }
}

const include = { publishedVersion: true } as const

export function createStoreDesignRepository(db: SeumeiPrismaClient, now: () => Date = () => new Date()): StoreDesignRepository {
  async function read(tenantId: string, companyId: string) {
    const row = await db.storePublication.findFirst({ where: { tenantId, companyId }, include })
    return row ? draft(row) : null
  }
  return {
    async readOrCreateDraft(tenantId, companyId, defaults) {
      const current = await read(tenantId, companyId)
      if (current) return current
      const company = await db.company.findFirst({ where: { id: companyId, tenantId, status: "ACTIVE" }, select: { id: true } })
      if (!company) throw new StoreDesignUnavailableError()
      const initial = validateStoreIdentityDraft({ preset: "MARKET_FRESH", headline: defaults.displayName, announcement: "", description: defaults.description, heroImageUrl: null })
      const created = await db.storePublication.create({ data: { tenantId, companyId, storeSlug: defaults.storeSlug, displayName: defaults.displayName, description: defaults.description, isPublished: false, draftPreset: initial.preset, draftHeadline: initial.headline, draftAnnouncement: initial.announcement, draftDescription: initial.description, draftHeroImageUrl: initial.heroImageUrl }, include })
      return draft(created)
    },
    async saveDraft(tenantId, companyId, expectedVersion, input) {
      const normalized = validateStoreIdentityDraft(input)
      await db.$transaction(async (tx) => {
        const changed = await tx.storePublication.updateMany({ where: { tenantId, companyId, draftVersion: expectedVersion }, data: { draftPreset: normalized.preset, draftHeadline: normalized.headline, draftAnnouncement: normalized.announcement, draftDescription: normalized.description, draftHeroImageUrl: normalized.heroImageUrl, draftVersion: { increment: 1 } } })
        if (changed.count !== 1) throw new StoreDesignConflictError()
      })
      return read(tenantId, companyId)
    },
    async publishDraft(tenantId, companyId, expectedVersion, actorUserId) {
      await db.$transaction(async (tx) => {
        const current = await tx.storePublication.findFirst({ where: { tenantId, companyId, draftVersion: expectedVersion } })
        if (!current) throw new StoreDesignConflictError()
        const normalized = validateStoreIdentityDraft({ preset: current.draftPreset as StoreIdentityPresetId, headline: current.draftHeadline, announcement: current.draftAnnouncement, description: current.draftDescription, heroImageUrl: current.draftHeroImageUrl })
        const aggregate = await tx.storePublicationVersion.aggregate({ where: { tenantId, publicationId: current.id }, _max: { version: true } })
        const publishedAt = now()
        const created = await tx.storePublicationVersion.create({ data: { tenantId, publicationId: current.id, version: (aggregate._max.version ?? 0) + 1, storeSlug: current.storeSlug, displayName: current.displayName, preset: normalized.preset, headline: normalized.headline, announcement: normalized.announcement, description: normalized.description, heroImageUrl: normalized.heroImageUrl, publishedByUserId: actorUserId, publishedAt }, select: { id: true } })
        const changed = await tx.storePublication.updateMany({ where: { id: current.id, tenantId, companyId, draftVersion: expectedVersion }, data: { description: normalized.description, isPublished: true, publishedAt, publishedVersionId: created.id, version: { increment: 1 }, draftVersion: { increment: 1 } } })
        if (changed.count !== 1) throw new StoreDesignConflictError()
      })
      return read(tenantId, companyId)
    },
    async unpublish(tenantId, companyId, expectedVersion) {
      const changed = await db.storePublication.updateMany({ where: { tenantId, companyId, draftVersion: expectedVersion }, data: { isPublished: false, publishedAt: null, publishedVersionId: null, version: { increment: 1 }, draftVersion: { increment: 1 } } })
      if (changed.count !== 1) throw new StoreDesignConflictError()
      return read(tenantId, companyId)
    },
    async findVersion(tenantId, versionId) {
      const row = await db.storePublicationVersion.findFirst({ where: { id: versionId, tenantId } })
      return row ? version(row) : null
    },
  }
}
