import { describe, expect, it, vi } from "vitest"
import type { StoreDesignRepository } from "../domain/repositories/store-design-repository"
import { StoreDesignCapabilityDeniedError, publishStoreDesign, readStoreDesign, saveStoreDesign } from "./store-design-service"

const company = { id: "company-a", tenantId: "tenant-a", name: "Galaxia Burger", slug: "galaxia-burger", createdByUserId: "owner-a", status: "ACTIVE" as const, operationType: "PHYSICAL_STORE" as const, city: "SP", country: "BR" }
const context = (role: "OWNER" | "MEMBER") => ({ userId: "user-a", role, company })
function repository(overrides: Partial<StoreDesignRepository> = {}) { return { readOrCreateDraft: vi.fn().mockResolvedValue({ publicationId: "publication-a" }), saveDraft: vi.fn().mockResolvedValue({ publicationId: "publication-a" }), publishDraft: vi.fn().mockResolvedValue({ publicationId: "publication-a" }), unpublish: vi.fn(), findVersion: vi.fn(), ...overrides } as unknown as StoreDesignRepository }

describe("store design service", () => {
  it("initializes the draft only inside the authorized company scope", async () => {
    const repo = repository()
    await readStoreDesign(context("OWNER"), repo)
    expect(repo.readOrCreateDraft).toHaveBeenCalledWith("tenant-a", "company-a", { storeSlug: "galaxia-burger", displayName: "Galaxia Burger", description: "Conheça Galaxia Burger e faça uma compra simulada." })
  })

  it("denies members before reading or writing store identity", async () => {
    const repo = repository()
    expect(() => readStoreDesign(context("MEMBER"), repo)).toThrow(StoreDesignCapabilityDeniedError)
    expect(() => saveStoreDesign(context("MEMBER"), { expectedVersion: 1, preset: "COSMIC_DINER", headline: "Sabor do espaço", announcement: "", description: "Descrição suficientemente longa.", heroImageUrl: null }, repo)).toThrow(StoreDesignCapabilityDeniedError)
    expect(repo.readOrCreateDraft).not.toHaveBeenCalled()
  })

  it("publishes with server actor and tenant authority", async () => {
    const repo = repository()
    await publishStoreDesign(context("OWNER"), 4, repo)
    expect(repo.publishDraft).toHaveBeenCalledWith("tenant-a", "company-a", 4, "user-a")
  })
})
