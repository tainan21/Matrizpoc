import { describe, expect, it } from "vitest"
import {
  IdempotencyConflictError,
  InMemoryLedgerRepository,
  InsufficientFundsError,
  LedgerService,
  calculateAccountBalance,
} from "./ledger"

const context = {
  actorId: "owner_123",
  reason: "Crédito autorizado pelo atendimento",
  correlationId: "corr_12345678",
}

describe("double-entry ledger", () => {
  it("issues MTRZ with balanced immutable postings", async () => {
    const repository = new InMemoryLedgerRepository()
    const service = new LedgerService(repository)
    const result = await service.issueMtrz({
      walletAccountId: "account_user",
      amountMinor: 150n,
      idempotencyKey: "idem_issue_1",
      ...context,
    })

    expect(result.postings).toEqual([
      expect.objectContaining({ accountId: "account_user", side: "DEBIT", amountMinor: 150n }),
      expect.objectContaining({ accountId: "system:mtrz-issuance", side: "CREDIT", amountMinor: 150n }),
    ])
    expect(result.postings.reduce((sum, posting) => sum + (posting.side === "DEBIT" ? posting.amountMinor : -posting.amountMinor), 0n)).toBe(0n)
    expect(calculateAccountBalance(result.postings, "account_user", "MTRZ")).toBe(150n)
    expect(Object.isFrozen(result)).toBe(true)
  })

  it("returns the original transaction for an identical idempotent retry", async () => {
    const service = new LedgerService(new InMemoryLedgerRepository())
    const input = { walletAccountId: "account_user", amountMinor: 40n, idempotencyKey: "idem_same", ...context }
    const first = await service.issueMtrz(input)
    const retry = await service.issueMtrz(input)
    expect(retry.id).toBe(first.id)
  })

  it("rejects reuse of an idempotency key with a different payload", async () => {
    const service = new LedgerService(new InMemoryLedgerRepository())
    await service.issueMtrz({ walletAccountId: "account_user", amountMinor: 40n, idempotencyKey: "idem_conflict", ...context })
    await expect(service.issueMtrz({ walletAccountId: "account_user", amountMinor: 41n, idempotencyKey: "idem_conflict", ...context })).rejects.toBeInstanceOf(IdempotencyConflictError)
  })

  it("serializes concurrent debits and never produces a negative user balance", async () => {
    const repository = new InMemoryLedgerRepository()
    const service = new LedgerService(repository)
    await service.issueMtrz({ walletAccountId: "account_user", amountMinor: 100n, idempotencyKey: "idem_seed", ...context })

    const results = await Promise.allSettled([
      service.withdrawMtrz({ walletAccountId: "account_user", amountMinor: 80n, idempotencyKey: "idem_debit_a", ...context }),
      service.withdrawMtrz({ walletAccountId: "account_user", amountMinor: 80n, idempotencyKey: "idem_debit_b", ...context }),
    ])

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    const rejected = results.find((result) => result.status === "rejected")
    expect(rejected).toMatchObject({ reason: expect.any(InsufficientFundsError) })
    expect(await service.balance("account_user", "MTRZ")).toBe(20n)
  })

  it("reverses with a compensating transaction and never edits original postings", async () => {
    const service = new LedgerService(new InMemoryLedgerRepository())
    const original = await service.issueMtrz({ walletAccountId: "account_user", amountMinor: 75n, idempotencyKey: "idem_original", ...context })
    const reversal = await service.reverse({ transactionId: original.id, idempotencyKey: "idem_reverse", ...context })

    expect(reversal.reversesTransactionId).toBe(original.id)
    expect(reversal.postings).toEqual(original.postings.map((posting) => expect.objectContaining({
      accountId: posting.accountId,
      side: posting.side === "DEBIT" ? "CREDIT" : "DEBIT",
      amountMinor: posting.amountMinor,
    })))
    expect(await service.balance("account_user", "MTRZ")).toBe(0n)
  })

  it("transfers MTRZ atomically between two user accounts", async () => {
    const service = new LedgerService(new InMemoryLedgerRepository())
    await service.issueMtrz({ walletAccountId: "account_source", amountMinor: 100n, idempotencyKey: "idem_transfer_seed", ...context })
    const transfer = await service.transferMtrz({ sourceAccountId: "account_source", destinationAccountId: "account_target", amountMinor: 60n, idempotencyKey: "idem_transfer", ...context })
    expect(transfer.kind).toBe("TRANSFER")
    expect(transfer.postings).toEqual([
      expect.objectContaining({ accountId: "account_source", side: "CREDIT", amountMinor: 60n }),
      expect.objectContaining({ accountId: "account_target", side: "DEBIT", amountMinor: 60n }),
    ])
    expect(await service.balance("account_source", "MTRZ")).toBe(40n)
    expect(await service.balance("account_target", "MTRZ")).toBe(60n)
  })

  it.each([0n, -1n])("rejects non-positive amounts (%s)", async (amountMinor) => {
    const service = new LedgerService(new InMemoryLedgerRepository())
    await expect(service.issueMtrz({ walletAccountId: "account_user", amountMinor, idempotencyKey: `idem_${amountMinor}`, ...context })).rejects.toThrow("positive")
  })
})
