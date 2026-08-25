import { describe, expect, it, vi } from "vitest"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"
import type { StoreDesignRepository } from "../domain/repositories/store-design-repository"
import { StoreDesignConflictError } from "../infrastructure/store-design.repository"
import { publishStoreDesignHandler, readStoreDesignHandler, saveStoreDesignHandler } from "./store-design-handlers"

const actor = { sessionUserId: "session-a", name: "Ana", email: "ana@example.com" }
const company = { id: "company-a", tenantId: "tenant-a", name: "Galaxia", slug: "galaxia", createdByUserId: "user-a", status: "ACTIVE" as const, operationType: "PHYSICAL_STORE" as const, city: "SP", country: "BR" }
function services(role: "OWNER" | "MEMBER" = "OWNER", overrides: Partial<StoreDesignRepository> = {}) { return { core: { resolveUser: vi.fn().mockResolvedValue({ id: "user-a", name: "Ana", email: actor.email }), listSeumeiMemberships: vi.fn().mockResolvedValue([{ tenantId: "tenant-a", role }]) } as unknown as CompleteCoreAccessRepository, companies: { findByIdForTenantIds: vi.fn().mockResolvedValue(company) } as unknown as CompanyRepository, storeDesign: { readOrCreateDraft: vi.fn().mockResolvedValue({ publicationId: "publication-a" }), saveDraft: vi.fn().mockResolvedValue({ publicationId: "publication-a" }), publishDraft: vi.fn().mockResolvedValue({ publicationId: "publication-a" }), unpublish: vi.fn(), findVersion: vi.fn(), ...overrides } as unknown as StoreDesignRepository } }

describe("store design HTTP boundaries", () => {
  it("rejects browser tenant authority before resolving membership", async () => {
    const svc = services()
    const result = await saveStoreDesignHandler(actor, "company-a", { tenantId: "tenant-b" }, svc)
    expect(result).toEqual({ status: 400, body: { error: "invalid_request" } })
    expect(svc.core.resolveUser).not.toHaveBeenCalled()
  })

  it("denies a member before any private draft read", async () => {
    const svc = services("MEMBER")
    expect(await readStoreDesignHandler(actor, "company-a", svc)).toEqual({ status: 403, body: { error: "store_design_forbidden" } })
    expect(svc.storeDesign.readOrCreateDraft).not.toHaveBeenCalled()
  })

  it("does not serialize tenant or persistence identifiers", async () => {
    const svc = services("OWNER", { readOrCreateDraft: vi.fn().mockResolvedValue({
      publicationId: "publication-secret", tenantId: "tenant-secret", companyId: "company-secret", storeSlug: "galaxia-burger", displayName: "Galaxia Burger", preset: "COSMIC_DINER", headline: "Smash de outro mundo.", announcement: "Retirada em 20 minutos", description: "Smashes preparados com receitas conectadas.", heroImageUrl: null, draftVersion: 2, isPublished: false, publishedVersion: null,
    }) })
    const result = await readStoreDesignHandler(actor, "company-a", svc)
    expect(result.status).toBe(200)
    expect(JSON.stringify(result.body)).not.toMatch(/tenant-secret|company-secret|publication-secret/)
  })

  it("maps stale publication to conflict", async () => {
    const svc = services("OWNER", { publishDraft: vi.fn().mockRejectedValue(new StoreDesignConflictError()) })
    expect(await publishStoreDesignHandler(actor, "company-a", { expectedVersion: 2 }, svc)).toEqual({ status: 409, body: { error: "store_design_conflict" } })
  })
})
