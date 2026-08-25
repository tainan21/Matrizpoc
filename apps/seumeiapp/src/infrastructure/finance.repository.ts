import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import { calculateFinanceOverview, requireFinancialEntryTransition, validateFinancialEntryDraft } from "../domain/finance"
import type {
  CreateManualFinancialEntryCommand,
  FinanceRepository,
  FinancialEntryRecord,
  TransitionManualFinancialEntryCommand,
} from "../domain/repositories/finance-repository"

export class FinanceConflictError extends Error {
  constructor() { super("O lançamento foi atualizado em outra sessão"); this.name = "FinanceConflictError" }
}

export class FinanceImmutableEntryError extends Error {
  constructor() { super("Recebimentos de pedidos não podem ser alterados manualmente"); this.name = "FinanceImmutableEntryError" }
}

const includeEvents = { events: { orderBy: { createdAt: "asc" as const } } }

function dateOnly(value: Date): string { return value.toISOString().slice(0, 10) }

function mapEntry(row: any): FinancialEntryRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    entryNumber: row.entryNumber,
    kind: row.kind,
    origin: row.origin,
    status: row.status,
    category: row.category,
    title: row.title,
    description: row.description,
    amountCents: row.amountCents,
    currency: row.currency,
    competenceDate: dateOnly(row.competenceDate),
    dueDate: dateOnly(row.dueDate),
    paidAt: row.paidAt?.toISOString() ?? null,
    orderId: row.orderId,
    version: row.version,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    events: (row.events ?? []).map((event: any) => ({ id: event.id, type: event.type, actorUserId: event.actorUserId, note: event.note, createdAt: event.createdAt.toISOString() })),
  }
}

function utcDate(value: string): Date { return new Date(`${value}T00:00:00.000Z`) }

export function createFinanceRepository(db: SeumeiPrismaClient): FinanceRepository {
  async function findEntry(tenantId: string, entryId: string) {
    const row = await db.financialEntry.findFirst({ where: { id: entryId, tenantId }, include: includeEvents })
    return row ? mapEntry(row) : null
  }

  async function nextEntryNumber(tx: any, tenantId: string): Promise<number> {
    const aggregate = await tx.financialEntry.aggregate({ where: { tenantId }, _max: { entryNumber: true } })
    return (aggregate._max.entryNumber ?? 0) + 1
  }

  return {
    async listOverview(tenantId, filters, today) {
      const rows = await db.financialEntry.findMany({ where: { tenantId }, include: includeEvents, orderBy: [{ competenceDate: "desc" }, { entryNumber: "desc" }] })
      const entries = rows.map(mapEntry)
      return { entries, overview: calculateFinanceOverview(entries, today, filters.competenceMonth) }
    },
    findEntry,
    async createManualEntry(tenantId, actorUserId, command: CreateManualFinancialEntryCommand) {
      const status = command.paidAt ? "PAID" : "OPEN"
      validateFinancialEntryDraft({ ...command, origin: "MANUAL", orderId: null, status })
      const row = await db.$transaction(async (tx) => tx.financialEntry.create({
        data: {
          tenantId,
          entryNumber: await nextEntryNumber(tx, tenantId),
          kind: command.kind,
          origin: "MANUAL",
          status,
          category: command.category,
          title: command.title,
          description: command.description,
          amountCents: command.amountCents,
          competenceDate: utcDate(command.competenceDate),
          dueDate: utcDate(command.dueDate),
          paidAt: command.paidAt ? new Date(command.paidAt) : null,
          idempotencyKey: command.idempotencyKey,
          createdByUserId: actorUserId,
          events: { create: [{ type: "CREATED", actorUserId }] },
        },
        include: includeEvents,
      }))
      return mapEntry(row)
    },
    async transitionManualEntry(tenantId, entryId, command: TransitionManualFinancialEntryCommand) {
      return db.$transaction(async (tx) => {
        const current = await tx.financialEntry.findFirst({ where: { id: entryId, tenantId }, include: includeEvents })
        if (!current) return null
        if (current.origin !== "MANUAL") throw new FinanceImmutableEntryError()
        requireFinancialEntryTransition(current.status, command.status)
        const changed = await tx.financialEntry.updateMany({
          where: { id: entryId, tenantId, version: command.expectedVersion, origin: "MANUAL", status: "OPEN" },
          data: { status: command.status, paidAt: command.status === "PAID" ? new Date(command.occurredAt) : null, version: { increment: 1 } },
        })
        if (changed.count !== 1) throw new FinanceConflictError()
        await tx.financialEntryEvent.create({ data: { tenantId, entryId, type: command.status, actorUserId: command.actorUserId, note: command.note } })
        const saved = await tx.financialEntry.findFirst({ where: { id: entryId, tenantId }, include: includeEvents })
        return saved ? mapEntry(saved) : null
      })
    },
    async reconcileOrderReceipt(tenantId, orderId) {
      return db.$transaction(async (tx) => {
        const existing = await tx.financialEntry.findFirst({ where: { tenantId, orderId }, include: includeEvents })
        if (existing) return mapEntry(existing)
        const order = await tx.commerceOrder.findFirst({ where: { id: orderId, tenantId, paymentStatus: "SIMULATED_APPROVED" } })
        if (!order) return null
        const occurredAt = order.createdAt
        const day = dateOnly(occurredAt)
        const created = await tx.financialEntry.create({
          data: {
            tenantId,
            entryNumber: await nextEntryNumber(tx, tenantId),
            kind: "INCOME",
            origin: "ORDER",
            status: "PAID",
            category: "SALES",
            title: `Pedido #${String(order.orderNumber).padStart(4, "0")}`,
            description: "Recebimento da compra simulada",
            amountCents: order.totalCents,
            currency: order.currency,
            competenceDate: utcDate(day),
            dueDate: utcDate(day),
            paidAt: occurredAt,
            orderId: order.id,
            idempotencyKey: `order-receipt:${order.id}`,
            createdByUserId: "public:demo-store",
            events: { create: [{ type: "CREATED", actorUserId: "public:demo-store", note: "Pagamento simulado aprovado" }] },
          },
          include: includeEvents,
        })
        return mapEntry(created)
      })
    },
  }
}
