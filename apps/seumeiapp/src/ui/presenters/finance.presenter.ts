import type { FinanceOverviewResult, FinancialEntryRecord } from "../../domain/repositories/finance-repository"

const KIND_LABEL = { INCOME: "Entrada", EXPENSE: "Saída" } as const
const ORIGIN_LABEL = { ORDER: "Pedido", MANUAL: "Manual" } as const
const STATUS_LABEL = { OPEN: "Em aberto", PAID: "Pago", CANCELLED: "Cancelado" } as const
const CATEGORY_LABEL = { SALES: "Vendas", OPERATIONS: "Operação", MARKETING: "Marketing", PEOPLE: "Pessoas", TAXES: "Impostos", OTHER: "Outros" } as const

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00.000Z`))
const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))

export function toFinanceEntryViewModel(entry: FinancialEntryRecord, today: string) {
  const overdue = entry.status === "OPEN" && entry.dueDate < today
  return {
    id: entry.id,
    numberLabel: `#${String(entry.entryNumber).padStart(4, "0")}`,
    title: entry.title,
    description: entry.description,
    kind: entry.kind,
    kindLabel: KIND_LABEL[entry.kind],
    originLabel: ORIGIN_LABEL[entry.origin],
    statusLabel: overdue ? "Em atraso" : STATUS_LABEL[entry.status],
    statusTone: overdue ? "overdue" : entry.status.toLowerCase(),
    categoryLabel: CATEGORY_LABEL[entry.category],
    amount: money(entry.amountCents),
    competenceLabel: date(entry.competenceDate),
    dueLabel: date(entry.dueDate),
    paidLabel: entry.paidAt ? dateTime(entry.paidAt) : null,
    version: entry.version,
    canManage: entry.origin === "MANUAL" && entry.status === "OPEN",
    events: entry.events.map((event) => ({ id: event.id, typeLabel: STATUS_LABEL[event.type === "CREATED" ? "OPEN" : event.type], note: event.note, createdLabel: dateTime(event.createdAt) })),
  }
}

export function toFinanceOverviewViewModel(result: FinanceOverviewResult, today: string) {
  return {
    metrics: [
      { label: "Caixa realizado", value: money(result.overview.realizedCashCents), tone: result.overview.realizedCashCents < 0 ? "negative" : "positive" },
      { label: "A receber", value: money(result.overview.receivableCents), tone: "neutral" },
      { label: "A pagar", value: money(result.overview.payableCents), tone: result.overview.payableCents > 0 ? "attention" : "neutral" },
      { label: "Resultado da competência", value: money(result.overview.competenceResultCents), tone: result.overview.competenceResultCents < 0 ? "negative" : "positive" },
    ],
    overdueLabel: result.overview.overdueCount === 1 ? "1 lançamento vencido" : `${result.overview.overdueCount} lançamentos vencidos`,
    entries: result.entries.map((entry) => toFinanceEntryViewModel(entry, today)),
  }
}
