import { randomUUID } from "node:crypto"
import { getPayDb } from "@matriz/platform-db/pay"
import { compareReconciliation } from "../domain/reconciliation"
import { CelcoinAdapter } from "../providers/celcoin/celcoin-adapter"

function celcoinAdapter() {
  return new CelcoinAdapter({
    baseUrl: process.env.CELCOIN_BASE_URL ?? "https://sandbox.openfinance.celcoin.dev",
    clientId: process.env.CELCOIN_CLIENT_ID ?? "",
    clientSecret: process.env.CELCOIN_CLIENT_SECRET ?? "",
    productionApproved: process.env.CELCOIN_PRODUCTION_APPROVED === "true",
  })
}

async function ledgerBrlBalance(walletId: string): Promise<bigint> {
  const account = await getPayDb().walletAccount.findUnique({ where: { walletId_currency: { walletId, currency: "BRL" } } })
  if (!account) return 0n
  const groups = await getPayDb().ledgerPosting.groupBy({ by: ["side"], where: { accountId: account.id }, _sum: { amountMinor: true } })
  return groups.reduce((sum, item) => sum + (item.side === "DEBIT" ? item._sum.amountMinor ?? 0n : -(item._sum.amountMinor ?? 0n)), 0n)
}

export async function runCelcoinReconciliation() {
  const correlationId = randomUUID()
  const run = await getPayDb().reconciliationRun.create({ data: { provider: "CELCOIN", correlationId } })
  try {
    const links = await getPayDb().providerAccountLink.findMany({ where: { provider: "CELCOIN" } })
    const adapter = links.length ? celcoinAdapter() : null
    const balances = await Promise.all(links.map(async (link) => ({ walletId: link.walletId, ledgerAmountMinor: await ledgerBrlBalance(link.walletId), providerAmountMinor: await adapter!.getBalanceMinor(link.providerAccountId) })))
    const result = compareReconciliation(balances)
    await getPayDb().$transaction(async (tx) => {
      if (result.discrepancies.length) await tx.reconciliationDiscrepancy.createMany({ data: result.discrepancies.map((item) => ({ reconciliationRunId: run.id, walletId: item.walletId, currency: item.currency, ledgerAmountMinor: item.ledgerAmountMinor, providerAmountMinor: item.providerAmountMinor, reason: item.reason })) })
      await tx.reconciliationRun.update({ where: { id: run.id }, data: { status: result.status, finishedAt: new Date(), summaryJson: { checkedAccounts: balances.length, discrepancies: result.discrepancies.length } } })
      if (result.status === "DIVERGENT") await tx.payOutboxEvent.create({ data: { eventName: "wallet.reconciliation.failed", payloadJson: { contractVersion: "v1", reconciliationRunId: run.id, correlationId, discrepancyCount: result.discrepancies.length } } })
    })
    return { id: run.id, ...result }
  } catch (error) {
    const message = error instanceof Error ? error.message : "RECONCILIATION_FAILED"
    await getPayDb().$transaction(async (tx) => {
      await tx.reconciliationRun.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date(), summaryJson: { error: message.slice(0, 500) } } })
      await tx.payOutboxEvent.create({ data: { eventName: "wallet.reconciliation.failed", payloadJson: { contractVersion: "v1", reconciliationRunId: run.id, correlationId, error: message.slice(0, 500) } } })
    })
    throw error
  }
}
