import { describe, expect, it } from "vitest"
import type { StoreDesignDraftRecord } from "../../domain/repositories/store-design-repository"
import { toStoreDesignViewModel } from "./store-design.presenter"

const draft: StoreDesignDraftRecord = { publicationId: "publication-a", tenantId: "tenant-secret", companyId: "company-secret", storeSlug: "galaxia-burger", displayName: "Galaxia Burger", preset: "COSMIC_DINER", headline: "Sabor de outro mundo", announcement: "Retirada em 20 minutos", description: "Smashes preparados com receitas conectadas.", heroImageUrl: "/demo/galaxia-smash.webp", draftVersion: 3, isPublished: true, publishedVersion: { id: "version-a", tenantId: "tenant-secret", publicationId: "publication-a", version: 2, storeSlug: "galaxia-burger", displayName: "Galaxia Burger", preset: "COSMIC_DINER", headline: "Sabor de outro mundo", announcement: "Retirada em 20 minutos", description: "Smashes preparados com receitas conectadas.", heroImageUrl: "/demo/galaxia-smash.webp", publishedByUserId: "owner-a", publishedAt: "2026-08-24T12:00:00.000Z" } }

describe("store design presenter", () => {
  it("presents curated choices and publication state without tenant authority", () => {
    const view = toStoreDesignViewModel(draft)
    expect(view.presets).toHaveLength(3)
    expect(view.statusLabel).toBe("Publicado · versão 2")
    expect(view.publicUrl).toBe("/store/galaxia-burger")
    expect(Object.keys(view.presets[0]!.tokens)).toEqual(["background", "foreground", "surface", "muted", "accent", "accentForeground", "border", "radius"])
    expect(JSON.stringify(view)).not.toContain("tenant-secret")
    expect(JSON.stringify(view)).not.toContain("company-secret")
  })
})
