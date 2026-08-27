import { getPayDb } from "@matriz/platform-db/pay"
import { requireOpsService } from "../../../../src/server/service-auth"
export async function GET(request: Request) {
  try { requireOpsService(request) } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }) }
  const db = getPayDb()
  const [wallets, accounts, pendingBrlIntents, openDiscrepancies, deadLetters, lastProviderEvent, lastReconciliation] = await Promise.all([
    db.wallet.count({ where: { NOT: { userId: { startsWith: "system:" } } } }),
    db.walletAccount.findMany({ where: { wallet: { NOT: { userId: { startsWith: "system:" } } } }, select: { id: true, currency: true } }),
    db.ledgerTransaction.count({ where: { kind: "BRL_CASH_OUT", status: "PENDING" } }),
    db.reconciliationDiscrepancy.count({ where: { status: "OPEN" } }),
    db.providerEvent.count({ where: { status: "DEAD_LETTER" } }),
    db.providerEvent.findFirst({ orderBy: { receivedAt: "desc" }, select: { status: true, receivedAt: true, processedAt: true } }),
    db.reconciliationRun.findFirst({ orderBy: { startedAt: "desc" } }),
  ])
  const postings = accounts.length ? await db.ledgerPosting.groupBy({ by: ["accountId", "side"], where: { accountId: { in: accounts.map((item) => item.id) } }, _sum: { amountMinor: true } }) : []
  const accountMap = new Map(accounts.map((item) => [item.id, item.currency]))
  const totals = postings.reduce((value, item) => { const currency = accountMap.get(item.accountId); if (currency) value[currency] += item.side === "DEBIT" ? item._sum.amountMinor ?? 0n : -(item._sum.amountMinor ?? 0n); return value }, { MTRZ: 0n, BRL: 0n })
  return Response.json({ contractVersion: "v1", wallets, balances: { MTRZ: totals.MTRZ.toString(), BRL: totals.BRL.toString() }, pendingBrlIntents, openDiscrepancies, deadLetters, lastProviderEvent: lastProviderEvent ? { status: lastProviderEvent.status, receivedAt: lastProviderEvent.receivedAt.toISOString(), processedAt: lastProviderEvent.processedAt?.toISOString() ?? null } : null, lastReconciliation: lastReconciliation ? { status: lastReconciliation.status, finishedAt: lastReconciliation.finishedAt?.toISOString() ?? null } : null })
}
