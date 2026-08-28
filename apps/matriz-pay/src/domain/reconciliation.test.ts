import { describe, expect, it } from "vitest"
import { compareReconciliation, evaluateReconciliationGate } from "./reconciliation"

describe("reconciliation", () => {
  it("is healthy when provider and ledger amounts match", () => {
    expect(compareReconciliation([{ walletId: "w1", ledgerAmountMinor: 1250n, providerAmountMinor: 1250n }])).toEqual({ status: "HEALTHY", discrepancies: [] })
  })

  it("reports every divergence using integer minor units", () => {
    expect(compareReconciliation([{ walletId: "w1", ledgerAmountMinor: 1250n, providerAmountMinor: 1200n }])).toEqual({ status: "DIVERGENT", discrepancies: [{ walletId: "w1", currency: "BRL", ledgerAmountMinor: 1250n, providerAmountMinor: 1200n, reason: "Provider balance differs from immutable ledger" }] })
  })

  it("blocks BRL outflow before the first reconciliation and after staleness", () => {
    const now = new Date("2026-08-25T12:00:00.000Z")
    expect(evaluateReconciliationGate({ lastRun: null, openDiscrepancies: 0, now, maxAgeMs: 15 * 60_000 })).toEqual({ status: "NOT_RUN", outgoingTransfersBlocked: true })
    expect(evaluateReconciliationGate({ lastRun: { status: "HEALTHY", finishedAt: new Date("2026-08-25T11:30:00.000Z") }, openDiscrepancies: 0, now, maxAgeMs: 15 * 60_000 })).toEqual({ status: "STALE", outgoingTransfersBlocked: true })
  })

  it("allows BRL outflow only with a fresh healthy run and no open discrepancy", () => {
    const now = new Date("2026-08-25T12:00:00.000Z")
    expect(evaluateReconciliationGate({ lastRun: { status: "HEALTHY", finishedAt: new Date("2026-08-25T11:55:00.000Z") }, openDiscrepancies: 0, now, maxAgeMs: 15 * 60_000 })).toEqual({ status: "HEALTHY", outgoingTransfersBlocked: false })
    expect(evaluateReconciliationGate({ lastRun: { status: "HEALTHY", finishedAt: new Date("2026-08-25T11:55:00.000Z") }, openDiscrepancies: 1, now, maxAgeMs: 15 * 60_000 })).toEqual({ status: "DIVERGENT", outgoingTransfersBlocked: true })
  })
})
