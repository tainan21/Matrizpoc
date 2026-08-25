import { resolveActiveCompanyContext } from "../application/active-company"
import { CompanyAccessDeniedError } from "../application/company-access"
import { InvalidStoreDesignCommandError, StoreDesignCapabilityDeniedError, publishStoreDesign, readStoreDesign, saveStoreDesign, unpublishStoreDesign } from "../application/store-design-service"
import { InvalidStoreIdentityError } from "../domain/store-identity"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"
import type { StoreDesignRepository } from "../domain/repositories/store-design-repository"
import { StoreDesignConflictError, StoreDesignUnavailableError } from "../infrastructure/store-design.repository"
import type { SessionActor } from "../types/session-actor"
import type { HttpResult } from "./company-handlers"

export interface StoreDesignHttpServices { readonly core: CompleteCoreAccessRepository; readonly companies: CompanyRepository; readonly storeDesign: StoreDesignRepository }
const record = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === "object" && !Array.isArray(value)
const validBody = (value: unknown): value is Record<string, any> => record(value) && !Object.hasOwn(value, "tenantId")
const context = (actor: SessionActor, companyId: string, services: StoreDesignHttpServices) => resolveActiveCompanyContext(actor, companyId, services.core, services.companies)
function publicDraft(value: any) { return { storeSlug: value.storeSlug, displayName: value.displayName, preset: value.preset, headline: value.headline, announcement: value.announcement, description: value.description, heroImageUrl: value.heroImageUrl, draftVersion: value.draftVersion, isPublished: value.isPublished, publishedVersion: value.publishedVersion ? { version: value.publishedVersion.version, publishedAt: value.publishedVersion.publishedAt } : null } }

function errorResult(error: unknown): HttpResult {
  if (error instanceof CompanyAccessDeniedError || error instanceof StoreDesignCapabilityDeniedError) return { status: 403, body: { error: "store_design_forbidden" } }
  if (error instanceof StoreDesignConflictError) return { status: 409, body: { error: "store_design_conflict" } }
  if (error instanceof StoreDesignUnavailableError) return { status: 404, body: { error: "store_design_not_found" } }
  if (error instanceof InvalidStoreIdentityError || error instanceof InvalidStoreDesignCommandError) return { status: 400, body: { error: "invalid_request", message: error.message } }
  return { status: 500, body: { error: "internal_error" } }
}

export async function readStoreDesignHandler(actor: SessionActor, companyId: string, services: StoreDesignHttpServices): Promise<HttpResult> { try { return { status: 200, body: { draft: publicDraft(await readStoreDesign(await context(actor, companyId, services), services.storeDesign)) } } } catch (error) { return errorResult(error) } }

export async function saveStoreDesignHandler(actor: SessionActor, companyId: string, body: unknown, services: StoreDesignHttpServices): Promise<HttpResult> {
  if (!validBody(body) || !Number.isSafeInteger(body.expectedVersion) || typeof body.preset !== "string" || typeof body.headline !== "string" || typeof body.announcement !== "string" || typeof body.description !== "string" || (body.heroImageUrl !== null && typeof body.heroImageUrl !== "string")) return { status: 400, body: { error: "invalid_request" } }
  try { const saved = await saveStoreDesign(await context(actor, companyId, services), body as never, services.storeDesign); return saved ? { status: 200, body: { draft: publicDraft(saved) } } : { status: 404, body: { error: "store_design_not_found" } } } catch (error) { return errorResult(error) }
}

async function publication(actor: SessionActor, companyId: string, body: unknown, services: StoreDesignHttpServices, action: "publish" | "unpublish"): Promise<HttpResult> {
  if (!validBody(body) || !Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 1) return { status: 400, body: { error: "invalid_request" } }
  try { const authorized = await context(actor, companyId, services); const draft = action === "publish" ? await publishStoreDesign(authorized, body.expectedVersion, services.storeDesign) : await unpublishStoreDesign(authorized, body.expectedVersion, services.storeDesign); return draft ? { status: 200, body: { draft: publicDraft(draft) } } : { status: 404, body: { error: "store_design_not_found" } } } catch (error) { return errorResult(error) }
}

export const publishStoreDesignHandler = (actor: SessionActor, companyId: string, body: unknown, services: StoreDesignHttpServices) => publication(actor, companyId, body, services, "publish")
export const unpublishStoreDesignHandler = (actor: SessionActor, companyId: string, body: unknown, services: StoreDesignHttpServices) => publication(actor, companyId, body, services, "unpublish")
