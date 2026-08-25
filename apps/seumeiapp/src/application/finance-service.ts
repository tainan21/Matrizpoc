import type { AuthorizedCompanyContext } from "./company-onboarding"
import { can } from "../domain/membership"
import type { FinancialEntryCategory, FinancialEntryKind } from "../domain/finance"
import type { FinanceRepository } from "../domain/repositories/finance-repository"

export class FinanceCapabilityDeniedError extends Error {
  constructor() { super("Sua função não permite acessar o financeiro"); this.name = "FinanceCapabilityDeniedError" }
}

export class InvalidFinanceCommandError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidFinanceCommandError" }
}

function requireCapability(context: AuthorizedCompanyContext, capability: "finance.read" | "finance.manage") {
  if (!can(context.role, capability)) throw new FinanceCapabilityDeniedError()
}

export function parseFinanceAmountToCents(value: string): number {
  const compact = value.trim().replace(/\s/g, "")
  const normalized = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new InvalidFinanceCommandError("Informe um valor monetário válido")
  const [units, fraction = ""] = normalized.split(".")
  const amountCents = Number(units) * 100 + Number(fraction.padEnd(2, "0"))
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new InvalidFinanceCommandError("Informe um valor monetário válido")
  return amountCents
}

export async function readFinanceOverview(
  context: AuthorizedCompanyContext,
  competenceMonth: string,
  today: string,
  repository: FinanceRepository,
) {
  requireCapability(context, "finance.read")
  return repository.listOverview(context.company.tenantId, { competenceMonth }, today)
}

export async function readFinanceEntry(context: AuthorizedCompanyContext, entryId: string, repository: FinanceRepository) {
  requireCapability(context, "finance.read")
  return repository.findEntry(context.company.tenantId, entryId)
}

export type CreateManualFinanceInput = {
  readonly title: string
  readonly description: string | null
  readonly kind: FinancialEntryKind
  readonly category: Exclude<FinancialEntryCategory, "SALES">
  readonly amount: string
  readonly competenceDate: string
  readonly dueDate: string
  readonly paid: boolean
  readonly idempotencyKey: string
}

export async function createManualFinanceEntry(
  context: AuthorizedCompanyContext,
  input: CreateManualFinanceInput,
  repository: FinanceRepository,
  now: () => Date = () => new Date(),
) {
  requireCapability(context, "finance.manage")
  const title = input.title.trim()
  if (title.length < 2 || title.length > 160) throw new InvalidFinanceCommandError("Informe um título válido")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.competenceDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw new InvalidFinanceCommandError("Informe competência e vencimento válidos")
  if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 128) throw new InvalidFinanceCommandError("Identificador da operação inválido")
  if (!(["INCOME", "EXPENSE"] as const).includes(input.kind)) throw new InvalidFinanceCommandError("Tipo financeiro inválido")
  if (!(["OPERATIONS", "MARKETING", "PEOPLE", "TAXES", "OTHER"] as const).includes(input.category)) throw new InvalidFinanceCommandError("Categoria financeira inválida")
  return repository.createManualEntry(context.company.tenantId, context.userId, {
    kind: input.kind,
    category: input.category,
    title,
    description: input.description?.trim() || null,
    amountCents: parseFinanceAmountToCents(input.amount),
    competenceDate: input.competenceDate,
    dueDate: input.dueDate,
    paidAt: input.paid ? now().toISOString() : null,
    idempotencyKey: input.idempotencyKey.trim(),
  })
}

type TransitionInput = { readonly expectedVersion: number; readonly note: string | null }

async function transition(
  context: AuthorizedCompanyContext,
  entryId: string,
  input: TransitionInput,
  status: "PAID" | "CANCELLED",
  repository: FinanceRepository,
  now: () => Date,
) {
  requireCapability(context, "finance.manage")
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) throw new InvalidFinanceCommandError("Versão financeira inválida")
  return repository.transitionManualEntry(context.company.tenantId, entryId, {
    expectedVersion: input.expectedVersion,
    status,
    occurredAt: now().toISOString(),
    actorUserId: context.userId,
    note: input.note?.trim() || null,
  })
}

export function payManualFinanceEntry(context: AuthorizedCompanyContext, entryId: string, input: TransitionInput, repository: FinanceRepository, now: () => Date = () => new Date()) {
  return transition(context, entryId, input, "PAID", repository, now)
}

export function cancelManualFinanceEntry(context: AuthorizedCompanyContext, entryId: string, input: TransitionInput, repository: FinanceRepository, now: () => Date = () => new Date()) {
  return transition(context, entryId, input, "CANCELLED", repository, now)
}
