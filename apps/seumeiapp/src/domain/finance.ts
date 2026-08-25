export type FinancialEntryKind = "INCOME" | "EXPENSE"
export type FinancialEntryOrigin = "ORDER" | "MANUAL"
export type FinancialEntryStatus = "OPEN" | "PAID" | "CANCELLED"
export type FinancialEntryCategory = "SALES" | "OPERATIONS" | "MARKETING" | "PEOPLE" | "TAXES" | "OTHER"

export type FinancialEntryDraft = {
  readonly kind: FinancialEntryKind
  readonly origin: FinancialEntryOrigin
  readonly category: FinancialEntryCategory
  readonly amountCents: number
  readonly competenceDate: string
  readonly dueDate: string
  readonly status: FinancialEntryStatus
  readonly paidAt: string | null
  readonly orderId: string | null
}

export type FinancialEntryForOverview = Pick<
  FinancialEntryDraft,
  "kind" | "status" | "amountCents" | "competenceDate" | "dueDate" | "paidAt"
>

export type FinanceOverview = {
  readonly realizedCashCents: number
  readonly receivableCents: number
  readonly payableCents: number
  readonly competenceResultCents: number
  readonly overdueCount: number
}

export class InvalidFinancialEntryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InvalidFinancialEntryError"
  }
}

export function validateFinancialEntryDraft<T extends FinancialEntryDraft>(draft: T): T {
  if (!Number.isSafeInteger(draft.amountCents) || draft.amountCents <= 0) {
    throw new InvalidFinancialEntryError("Valor financeiro inválido")
  }
  if (draft.dueDate < draft.competenceDate) {
    throw new InvalidFinancialEntryError("Vencimento não pode anteceder a competência")
  }
  if (draft.status === "PAID" && !draft.paidAt) {
    throw new InvalidFinancialEntryError("Pagamento obrigatório para lançamento pago")
  }
  if (draft.status !== "PAID" && draft.paidAt) {
    throw new InvalidFinancialEntryError("Somente lançamento pago possui data de pagamento")
  }
  if (draft.origin === "ORDER" && (draft.kind !== "INCOME" || draft.category !== "SALES" || !draft.orderId)) {
    throw new InvalidFinancialEntryError("Recebimento de pedido inválido")
  }
  return draft
}

export function requireFinancialEntryTransition(
  from: FinancialEntryStatus,
  to: FinancialEntryStatus,
): FinancialEntryStatus {
  if (from !== "OPEN" || (to !== "PAID" && to !== "CANCELLED")) {
    throw new InvalidFinancialEntryError("Transição financeira inválida")
  }
  return to
}

export function calculateFinanceOverview(
  entries: readonly FinancialEntryForOverview[],
  today: string,
  competenceMonth: string,
): FinanceOverview {
  let realizedCashCents = 0
  let receivableCents = 0
  let payableCents = 0
  let competenceResultCents = 0
  let overdueCount = 0

  for (const entry of entries) {
    if (entry.status === "CANCELLED") continue
    const signedAmount = entry.kind === "INCOME" ? entry.amountCents : -entry.amountCents
    if (entry.status === "PAID") realizedCashCents += signedAmount
    if (entry.status === "OPEN") {
      if (entry.kind === "INCOME") receivableCents += entry.amountCents
      else payableCents += entry.amountCents
      if (entry.dueDate < today) overdueCount += 1
    }
    if (entry.competenceDate.startsWith(`${competenceMonth}-`)) competenceResultCents += signedAmount
  }

  return { realizedCashCents, receivableCents, payableCents, competenceResultCents, overdueCount }
}
