export interface BalanceComparison { readonly walletId: string; readonly ledgerAmountMinor: bigint; readonly providerAmountMinor: bigint }
export interface ReconciliationDiscrepancyValue extends BalanceComparison { readonly currency: "BRL"; readonly reason: string }
export function compareReconciliation(items: readonly BalanceComparison[]): { readonly status: "HEALTHY" | "DIVERGENT"; readonly discrepancies: readonly ReconciliationDiscrepancyValue[] } {
  const discrepancies = items.filter((item) => item.ledgerAmountMinor !== item.providerAmountMinor).map((item) => ({ ...item, currency: "BRL" as const, reason: "Provider balance differs from immutable ledger" }))
  return { status: discrepancies.length ? "DIVERGENT" : "HEALTHY", discrepancies }
}

export type ReconciliationGateStatus = "NOT_RUN" | "RUNNING" | "HEALTHY" | "DIVERGENT" | "FAILED" | "STALE"

export function evaluateReconciliationGate(input: {
  readonly lastRun: { readonly status: "RUNNING" | "HEALTHY" | "DIVERGENT" | "FAILED"; readonly finishedAt: Date | null } | null
  readonly openDiscrepancies: number
  readonly now: Date
  readonly maxAgeMs: number
}): { readonly status: ReconciliationGateStatus; readonly outgoingTransfersBlocked: boolean } {
  if (input.openDiscrepancies > 0) return { status: "DIVERGENT", outgoingTransfersBlocked: true }
  if (!input.lastRun) return { status: "NOT_RUN", outgoingTransfersBlocked: true }
  if (input.lastRun.status !== "HEALTHY") return { status: input.lastRun.status, outgoingTransfersBlocked: true }
  if (!input.lastRun.finishedAt || input.now.getTime() - input.lastRun.finishedAt.getTime() > input.maxAgeMs) {
    return { status: "STALE", outgoingTransfersBlocked: true }
  }
  return { status: "HEALTHY", outgoingTransfersBlocked: false }
}
