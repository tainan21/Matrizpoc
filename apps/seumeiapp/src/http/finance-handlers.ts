import { resolveActiveCompanyContext } from "../application/active-company"
import { CompanyAccessDeniedError } from "../application/company-access"
import {
  FinanceCapabilityDeniedError,
  InvalidFinanceCommandError,
  cancelManualFinanceEntry,
  createManualFinanceEntry,
  payManualFinanceEntry,
  readFinanceEntry,
  readFinanceOverview,
} from "../application/finance-service"
import { InvalidFinancialEntryError } from "../domain/finance"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"
import type { FinanceRepository } from "../domain/repositories/finance-repository"
import { FinanceConflictError, FinanceImmutableEntryError } from "../infrastructure/finance.repository"
import type { SessionActor } from "../types/session-actor"
import type { HttpResult } from "./company-handlers"

export interface FinanceHttpServices {
  readonly core: CompleteCoreAccessRepository
  readonly companies: CompanyRepository
  readonly finance: FinanceRepository
}

const record = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === "object" && !Array.isArray(value)
const validBody = (value: unknown): value is Record<string, any> => record(value) && !Object.hasOwn(value, "tenantId")
async function context(actor: SessionActor, companyId: string, services: FinanceHttpServices) { return resolveActiveCompanyContext(actor, companyId, services.core, services.companies) }

function errorResult(error: unknown): HttpResult {
  if (error instanceof CompanyAccessDeniedError || error instanceof FinanceCapabilityDeniedError) return { status: 403, body: { error: "finance_forbidden" } }
  if (error instanceof FinanceConflictError || error instanceof FinanceImmutableEntryError || (record(error) && error.code === "P2002")) return { status: 409, body: { error: "finance_conflict" } }
  if (error instanceof InvalidFinanceCommandError || error instanceof InvalidFinancialEntryError) return { status: 400, body: { error: "invalid_request", message: error.message } }
  return { status: 500, body: { error: "internal_error" } }
}

export async function listFinanceHandler(actor: SessionActor, companyId: string, competenceMonth: string, services: FinanceHttpServices, now: () => Date = () => new Date()): Promise<HttpResult> {
  if (!/^\d{4}-\d{2}$/.test(competenceMonth)) return { status: 400, body: { error: "invalid_request" } }
  try {
    const current = now()
    const result = await readFinanceOverview(await context(actor, companyId, services), competenceMonth, current.toISOString().slice(0, 10), services.finance)
    return { status: 200, body: result }
  } catch (error) { return errorResult(error) }
}

export async function createFinanceEntryHandler(actor: SessionActor, companyId: string, body: unknown, services: FinanceHttpServices, now: () => Date = () => new Date()): Promise<HttpResult> {
  if (!validBody(body) || typeof body.title !== "string" || (body.description !== null && typeof body.description !== "string") || !["INCOME", "EXPENSE"].includes(body.kind) || !["OPERATIONS", "MARKETING", "PEOPLE", "TAXES", "OTHER"].includes(body.category) || typeof body.amount !== "string" || typeof body.competenceDate !== "string" || typeof body.dueDate !== "string" || typeof body.paid !== "boolean" || typeof body.idempotencyKey !== "string") return { status: 400, body: { error: "invalid_request" } }
  try {
    const entry = await createManualFinanceEntry(await context(actor, companyId, services), body as any, services.finance, now)
    return { status: 201, body: { entry } }
  } catch (error) { return errorResult(error) }
}

export async function readFinanceEntryHandler(actor: SessionActor, companyId: string, entryId: string, services: FinanceHttpServices): Promise<HttpResult> {
  try {
    const entry = await readFinanceEntry(await context(actor, companyId, services), entryId, services.finance)
    return entry ? { status: 200, body: { entry } } : { status: 404, body: { error: "finance_not_found" } }
  } catch (error) { return errorResult(error) }
}

function validTransitionBody(body: unknown): body is { expectedVersion: number; note: string | null } {
  return validBody(body) && Number.isSafeInteger(body.expectedVersion) && body.expectedVersion > 0 && (body.note === null || typeof body.note === "string")
}

export async function payFinanceEntryHandler(actor: SessionActor, companyId: string, entryId: string, body: unknown, services: FinanceHttpServices, now: () => Date = () => new Date()): Promise<HttpResult> {
  if (!validTransitionBody(body)) return { status: 400, body: { error: "invalid_request" } }
  try {
    const entry = await payManualFinanceEntry(await context(actor, companyId, services), entryId, body, services.finance, now)
    return entry ? { status: 200, body: { entry } } : { status: 404, body: { error: "finance_not_found" } }
  } catch (error) { return errorResult(error) }
}

export async function cancelFinanceEntryHandler(actor: SessionActor, companyId: string, entryId: string, body: unknown, services: FinanceHttpServices, now: () => Date = () => new Date()): Promise<HttpResult> {
  if (!validTransitionBody(body)) return { status: 400, body: { error: "invalid_request" } }
  try {
    const entry = await cancelManualFinanceEntry(await context(actor, companyId, services), entryId, body, services.finance, now)
    return entry ? { status: 200, body: { entry } } : { status: 404, body: { error: "finance_not_found" } }
  } catch (error) { return errorResult(error) }
}
