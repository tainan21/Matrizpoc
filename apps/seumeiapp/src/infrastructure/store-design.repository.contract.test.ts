import { describe, expect, it } from "vitest"
import { createStoreDesignRepository } from "./store-design.repository"

function publication(overrides: Record<string, unknown> = {}) {
  return { id: "publication-a", tenantId: "tenant-a", companyId: "company-a", storeSlug: "galaxia-burger", displayName: "Galaxia Burger", description: "Publicado", isPublished: true, version: 2, publishedAt: new Date("2026-08-24T12:00:00.000Z"), draftPreset: "COSMIC_DINER", draftHeadline: "Sabor de outro mundo", draftAnnouncement: "Retirada em 20 minutos", draftDescription: "Smashes preparados com receitas conectadas.", draftHeroImageUrl: "/demo/galaxia-smash.webp", draftVersion: 3, publishedVersionId: "version-a", createdAt: new Date(), updatedAt: new Date(), publishedVersion: null, ...overrides }
}

describe("store design repository tenant contract", () => {
  it("does not resolve a known publication version from another tenant", async () => {
    const db = { storePublicationVersion: { findFirst: async ({ where }: any) => where.tenantId === "tenant-b" ? { id: "version-b" } : null } }
    const repository = createStoreDesignRepository(db as never)
    await expect(repository.findVersion("tenant-a", "version-b")).resolves.toBeNull()
  })

  it("creates a deterministic tenant-scoped draft when none exists", async () => {
    let created: any
    const db = {
      company: { findFirst: async ({ where }: any) => where.tenantId === "tenant-a" && where.id === "company-a" ? { id: "company-a" } : null },
      storePublication: {
        findFirst: async () => null,
        create: async ({ data }: any) => { created = data; return publication({ ...data, id: "publication-a", draftVersion: data.draftVersion ?? 1, publishedVersion: null }) },
      },
    }
    const repository = createStoreDesignRepository(db as never)
    const draft = await repository.readOrCreateDraft("tenant-a", "company-a", { storeSlug: "galaxia-burger", displayName: "Galaxia Burger", description: "Smashes preparados com receitas conectadas." })
    expect(created).toMatchObject({ tenantId: "tenant-a", companyId: "company-a", isPublished: false, draftPreset: "MARKET_FRESH" })
    expect(draft).toMatchObject({ tenantId: "tenant-a", draftVersion: 1, headline: "Galaxia Burger" })
  })

  it("rejects a stale draft version instead of overwriting it", async () => {
    const db = { $transaction: async (work: (tx: any) => Promise<unknown>) => work({ storePublication: { updateMany: async () => ({ count: 0 }) } }) }
    const repository = createStoreDesignRepository(db as never)
    await expect(repository.saveDraft("tenant-a", "company-a", 2, { preset: "COSMIC_DINER", headline: "Novo título", announcement: "", description: "Descrição suficientemente longa.", heroImageUrl: null })).rejects.toThrow("A identidade visual foi atualizada em outra sessão")
  })

  it("publishes an immutable snapshot and advances the optimistic version", async () => {
    const current = publication({ isPublished: false, publishedVersionId: null })
    let versionData: any; let updateData: any
    const saved = publication({ draftVersion: 4, publishedVersion: { id: "version-new", tenantId: "tenant-a", publicationId: "publication-a", version: 3, storeSlug: "galaxia-burger", displayName: "Galaxia Burger", preset: "COSMIC_DINER", headline: "Sabor de outro mundo", announcement: "Retirada em 20 minutos", description: "Smashes preparados com receitas conectadas.", heroImageUrl: "/demo/galaxia-smash.webp", publishedByUserId: "owner-a", publishedAt: new Date("2026-08-24T13:00:00.000Z") } })
    const tx = {
      storePublication: { findFirst: async () => current, updateMany: async ({ data }: any) => { updateData = data; return { count: 1 } } },
      storePublicationVersion: { aggregate: async () => ({ _max: { version: 2 } }), create: async ({ data }: any) => { versionData = data; return { id: "version-new" } } },
    }
    const db = { $transaction: async (work: (value: any) => Promise<unknown>) => work(tx), storePublication: { findFirst: async () => saved } }
    const repository = createStoreDesignRepository(db as never, () => new Date("2026-08-24T13:00:00.000Z"))
    const result = await repository.publishDraft("tenant-a", "company-a", 3, "owner-a")
    expect(versionData).toMatchObject({ tenantId: "tenant-a", publicationId: "publication-a", version: 3, preset: "COSMIC_DINER", publishedByUserId: "owner-a" })
    expect(updateData).toMatchObject({ isPublished: true, publishedVersionId: "version-new", draftVersion: { increment: 1 } })
    expect(result?.publishedVersion?.id).toBe("version-new")
  })
})
