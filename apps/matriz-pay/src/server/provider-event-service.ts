import { Prisma } from "../../../../node_modules/.prisma/pay/index.js"
import { getPayDb } from "@matriz/platform-db/pay"
import { processProviderEvent, type ProviderInboxEvent } from "../domain/provider-event"

const PROVIDER_ACCOUNT_ID = "account_system_brl_provider"

function nestedString(payload: Record<string, unknown>, names: readonly string[]): string | undefined {
  for (const [key, value] of Object.entries(payload)) {
    if (names.some((name) => name.toLowerCase() === key.toLowerCase()) && typeof value === "string" && value.trim()) return value.trim()
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const found = nestedString(value as Record<string, unknown>, names)
      if (found) return found
    }
  }
  return undefined
}

function eventAmountMinor(payload: Record<string, unknown>): bigint {
  const minor = nestedString(payload, ["amountMinor", "amountInCents"])
  if (minor && /^[1-9]\d*$/.test(minor)) return BigInt(minor)
  const decimal = nestedString(payload, ["amountExact", "amount", "value"])
  if (!decimal || !/^\d+(?:\.\d{1,2})?$/.test(decimal)) throw new Error("PROVIDER_AMOUNT_MUST_BE_EXACT_DECIMAL_STRING")
  const [units, rawCents = ""] = decimal.split(".") as [string, string?]
  const cents = rawCents.padEnd(2, "0")
  const result = BigInt(units) * 100n + BigInt(cents)
  if (result <= 0n) throw new Error("PROVIDER_AMOUNT_INVALID")
  return result
}

function providerReference(payload: Record<string, unknown>): string {
  const value = nestedString(payload, ["providerReference", "endToEndId", "transactionId", "clientCode"])
  if (!value) throw new Error("PROVIDER_REFERENCE_MISSING")
  return value
}

function providerAccount(payload: Record<string, unknown>): string {
  const value = nestedString(payload, ["providerAccountId", "account", "accountNumber"])
  if (!value) throw new Error("PROVIDER_ACCOUNT_MISSING")
  return value
}

function isCashIn(eventType: string): boolean { return /PIX[_ .-]?(PAYMENT[_ .-]?)?IN|CASH[_ .-]?IN|CREDIT|RECEIVEPIX/i.test(eventType) }
function isCashOut(eventType: string): boolean { return /PIX[_ .-]?OUT|CASH[_ .-]?OUT|DEBIT/i.test(eventType) }
function isConfirmed(eventType: string): boolean { return /CONFIRMED|CONFIRMADO|COMPLETED|SUCCESS|^pix-payment-(in|out)$/i.test(eventType) }

async function postConfirmed(event: ProviderInboxEvent): Promise<string> {
  if (!isConfirmed(event.eventType)) throw new Error("PROVIDER_EVENT_NOT_CONFIRMED")
  const reference = providerReference(event.payload)
  const amountMinor = eventAmountMinor(event.payload)
  return getPayDb().$transaction(async (tx) => {
    const processed = await tx.providerEvent.findUnique({ where: { id: event.id }, select: { processedTransactionId: true } })
    if (processed?.processedTransactionId) return processed.processedTransactionId
    if (isCashOut(event.eventType)) {
      const intent = await tx.ledgerTransaction.findFirst({ where: { OR: [{ providerReference: reference }, { correlationId: reference }], kind: "BRL_CASH_OUT" }, include: { postings: true } })
      if (!intent) throw new Error("BRL_INTENT_NOT_FOUND")
      if (intent.amountMinor !== amountMinor) throw new Error("PROVIDER_AMOUNT_MISMATCH")
      if (intent.status === "POSTED") return intent.id
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${intent.walletId ?? intent.id}))`
      const account = await tx.walletAccount.findUnique({ where: { walletId_currency: { walletId: intent.walletId!, currency: "BRL" } } })
      if (!account) throw new Error("WALLET_NOT_FOUND")
      const grouped = await tx.ledgerPosting.groupBy({ by: ["side"], where: { accountId: account.id }, _sum: { amountMinor: true } })
      const balance = grouped.reduce((sum, group) => sum + (group.side === "DEBIT" ? group._sum.amountMinor ?? 0n : -(group._sum.amountMinor ?? 0n)), 0n)
      if (balance < amountMinor) throw new Error("INSUFFICIENT_FUNDS")
      await tx.ledgerPosting.createMany({ data: [
        { transactionId: intent.id, accountId: account.id, currency: "BRL", side: "CREDIT", amountMinor },
        { transactionId: intent.id, accountId: PROVIDER_ACCOUNT_ID, currency: "BRL", side: "DEBIT", amountMinor },
      ] })
      await tx.ledgerTransaction.update({ where: { id: intent.id }, data: { status: "POSTED", providerReference: reference, postedAt: new Date() } })
      await tx.payOutboxEvent.create({ data: { transactionId: intent.id, eventName: "wallet.entry.posted", payloadJson: { contractVersion: "v1", transactionId: intent.id, walletId: intent.walletId, currency: "BRL", amountMinor: amountMinor.toString(), providerReference: reference, correlationId: intent.correlationId } } })
      return intent.id
    }
    if (!isCashIn(event.eventType)) throw new Error("PROVIDER_EVENT_TYPE_UNSUPPORTED")
    const link = await tx.providerAccountLink.findUnique({ where: { provider_providerAccountId: { provider: "CELCOIN", providerAccountId: providerAccount(event.payload) } } })
    if (!link) throw new Error("PROVIDER_ACCOUNT_LINK_NOT_FOUND")
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${link.walletId}))`
    const existing = await tx.ledgerTransaction.findUnique({ where: { providerReference: reference }, include: { postings: true } })
    if (existing) return existing.id
    const account = await tx.walletAccount.findUnique({ where: { walletId_currency: { walletId: link.walletId, currency: "BRL" } } })
    if (!account) throw new Error("WALLET_NOT_FOUND")
    const transaction = await tx.ledgerTransaction.create({ data: { walletId: link.walletId, kind: "BRL_CASH_IN", status: "POSTED", currency: "BRL", amountMinor, idempotencyKey: `celcoin:${event.providerEventId}`, requestHash: event.providerEventId, reason: "Celcoin Pix cash-in confirmed", actorId: "service:celcoin-webhook", correlationId: reference, providerReference: reference, postedAt: new Date(), postings: { create: [
      { accountId: account.id, currency: "BRL", side: "DEBIT", amountMinor },
      { accountId: PROVIDER_ACCOUNT_ID, currency: "BRL", side: "CREDIT", amountMinor },
    ] } } })
    await tx.payOutboxEvent.create({ data: { transactionId: transaction.id, eventName: "wallet.entry.posted", payloadJson: { contractVersion: "v1", transactionId: transaction.id, walletId: link.walletId, currency: "BRL", amountMinor: amountMinor.toString(), providerReference: reference, correlationId: reference } } })
    return transaction.id
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function processStoredProviderEvent(eventId: string): Promise<string> {
  const db = getPayDb()
  const stored = await db.providerEvent.update({ where: { id: eventId }, data: { status: "PROCESSING", attempts: { increment: 1 } } })
  return processProviderEvent({ id: stored.id, providerEventId: stored.providerEventId, eventType: stored.eventType, payload: stored.payloadJson as Record<string, unknown>, attempts: Math.max(0, stored.attempts - 1), processedTransactionId: stored.processedTransactionId ?? undefined }, {
    postConfirmed,
    markProcessed: async (id, transactionId) => { await db.providerEvent.update({ where: { id }, data: { status: "PROCESSED", processedAt: new Date(), processedTransactionId: transactionId, nextRetryAt: null, lastError: null } }) },
    markRetry: async (id, attempts, message) => { await db.providerEvent.update({ where: { id }, data: { status: "RETRY", nextRetryAt: new Date(Date.now() + Math.min(3600, 2 ** attempts * 15) * 1000), lastError: message.slice(0, 500) } }) },
    markDeadLetter: async (id, message) => { await db.providerEvent.update({ where: { id }, data: { status: "DEAD_LETTER", nextRetryAt: null, lastError: message.slice(0, 500) } }) },
  })
}

export async function processDueProviderEvents(limit = 25) {
  const events = await getPayDb().providerEvent.findMany({ where: { status: { in: ["RECEIVED", "RETRY"] }, OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }] }, orderBy: { receivedAt: "asc" }, take: Math.min(limit, 100) })
  const results = []
  for (const event of events) {
    try { results.push({ id: event.id, status: "PROCESSED", transactionId: await processStoredProviderEvent(event.id) }) }
    catch (error) { results.push({ id: event.id, status: "FAILED", error: error instanceof Error ? error.message : "UNKNOWN" }) }
  }
  return results
}
