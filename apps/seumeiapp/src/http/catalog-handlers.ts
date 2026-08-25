import { resolveActiveCompanyContext } from "../application/active-company"
import { CatalogCapabilityDeniedError, CatalogRecordNotFoundError, createCatalogCategory, createCatalogProduct, readCatalog, updateCatalogProduct } from "../application/catalog-service"
import { CompanyAccessDeniedError } from "../application/company-access"
import { InvalidCatalogInputError } from "../domain/catalog"
import type { CatalogRepository } from "../domain/repositories/catalog-repository"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"
import type { SessionActor } from "../types/session-actor"
import type { HttpResult } from "./company-handlers"

export interface CatalogHttpServices { readonly core: CompleteCoreAccessRepository; readonly companies: CompanyRepository; readonly catalog: CatalogRepository }
function record(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === "object" && !Array.isArray(value) }
function errorResult(error: unknown): HttpResult {
  if (error instanceof CompanyAccessDeniedError || error instanceof CatalogCapabilityDeniedError) return { status: 403, body: { error: "catalog_forbidden" } }
  if (error instanceof CatalogRecordNotFoundError) return { status: 404, body: { error: "catalog_not_found" } }
  if (error instanceof InvalidCatalogInputError) return { status: 400, body: { error: "invalid_request", message: error.message } }
  if (record(error) && error.code === "P2002") return { status: 409, body: { error: "catalog_conflict" } }
  return { status: 500, body: { error: "internal_error" } }
}
async function context(actor: SessionActor, companyId: string, services: CatalogHttpServices) { return resolveActiveCompanyContext(actor, companyId, services.core, services.companies) }
function validBody(body: unknown): body is Record<string, any> { return record(body) && !Object.hasOwn(body, "tenantId") }

export async function listCatalogHandler(actor: SessionActor, companyId: string, services: CatalogHttpServices): Promise<HttpResult> {
  try { return { status: 200, body: { catalog: await readCatalog(await context(actor, companyId, services), services.catalog) } } } catch (error) { return errorResult(error) }
}
export async function createCategoryHandler(actor: SessionActor, companyId: string, body: unknown, services: CatalogHttpServices): Promise<HttpResult> {
  if (!validBody(body) || typeof body.name !== "string") return { status: 400, body: { error: "invalid_request" } }
  try { return { status: 201, body: { category: await createCatalogCategory(await context(actor, companyId, services), body as any, services.catalog) } } } catch (error) { return errorResult(error) }
}
export async function createProductHandler(actor: SessionActor, companyId: string, body: unknown, services: CatalogHttpServices): Promise<HttpResult> {
  if (!validBody(body) || typeof body.name !== "string" || !Array.isArray(body.variants) || !["SIMPLE", "CONFIGURABLE"].includes(body.type) || !["DRAFT", "ACTIVE", "ARCHIVED"].includes(body.status)) return { status: 400, body: { error: "invalid_request" } }
  try { return { status: 201, body: { product: await createCatalogProduct(await context(actor, companyId, services), body as any, services.catalog) } } } catch (error) { return errorResult(error) }
}
export async function updateProductHandler(actor: SessionActor, companyId: string, productId: string, body: unknown, services: CatalogHttpServices): Promise<HttpResult> {
  if (!validBody(body) || !Number.isInteger(body.expectedVersion) || typeof body.name !== "string" || !Array.isArray(body.variants)) return { status: 400, body: { error: "invalid_request" } }
  try { return { status: 200, body: { product: await updateCatalogProduct(await context(actor, companyId, services), productId, body.expectedVersion, body as any, services.catalog) } } } catch (error) { return errorResult(error) }
}
