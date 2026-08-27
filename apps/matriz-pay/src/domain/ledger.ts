export type Currency = "MTRZ" | "BRL"
export type PostingSide = "DEBIT" | "CREDIT"
export type TransactionKind = "ISSUE" | "WITHDRAW" | "TRANSFER" | "REVERSAL" | "BRL_CASH_IN" | "BRL_CASH_OUT"

export interface LedgerPosting {
  readonly accountId: string
  readonly currency: Currency
  readonly side: PostingSide
  readonly amountMinor: bigint
}

export interface LedgerTransaction {
  readonly id: string
  readonly kind: TransactionKind
  readonly currency: Currency
  readonly amountMinor: bigint
  readonly idempotencyKey: string
  readonly reason: string
  readonly actorId: string
  readonly correlationId: string
  readonly reversesTransactionId?: string
  readonly postings: readonly LedgerPosting[]
  readonly createdAt: string
}

export class IdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT"
  constructor() { super("Idempotency key was already used with a different request") }
}

export class InsufficientFundsError extends Error {
  readonly code = "INSUFFICIENT_FUNDS"
  constructor() { super("Insufficient funds; negative balances are forbidden") }
}

interface IdempotentRecord {
  readonly fingerprint: string
  readonly transaction: LedgerTransaction
}

export interface LedgerRepository {
  executeAtomic(
    idempotencyKey: string,
    fingerprint: string,
    create: (transactions: readonly LedgerTransaction[]) => LedgerTransaction,
  ): Promise<LedgerTransaction>
  list(): Promise<readonly LedgerTransaction[]>
}

export class InMemoryLedgerRepository implements LedgerRepository {
  private readonly transactions: LedgerTransaction[] = []
  private readonly idempotency = new Map<string, IdempotentRecord>()
  private tail: Promise<void> = Promise.resolve()

  executeAtomic(
    idempotencyKey: string,
    fingerprint: string,
    create: (transactions: readonly LedgerTransaction[]) => LedgerTransaction,
  ): Promise<LedgerTransaction> {
    const operation = this.tail.then(() => {
      const existing = this.idempotency.get(idempotencyKey)
      if (existing) {
        if (existing.fingerprint !== fingerprint) throw new IdempotencyConflictError()
        return existing.transaction
      }
      const transaction = create(this.transactions)
      this.transactions.push(transaction)
      this.idempotency.set(idempotencyKey, { fingerprint, transaction })
      return transaction
    })
    this.tail = operation.then(() => undefined, () => undefined)
    return operation
  }

  async list(): Promise<readonly LedgerTransaction[]> {
    await this.tail
    return [...this.transactions]
  }
}

interface MutationContext {
  readonly idempotencyKey: string
  readonly actorId: string
  readonly reason: string
  readonly correlationId: string
}

interface MtrzMutation extends MutationContext {
  readonly walletAccountId: string
  readonly amountMinor: bigint
}

interface ReversalMutation extends MutationContext {
  readonly transactionId: string
}

interface TransferMutation extends MutationContext {
  readonly sourceAccountId: string
  readonly destinationAccountId: string
  readonly amountMinor: bigint
}

function assertContext(input: MutationContext): void {
  if (!input.idempotencyKey.trim()) throw new Error("Idempotency-Key is required")
  if (!input.actorId.trim()) throw new Error("actor is required")
  if (input.reason.trim().length < 8) throw new Error("reason must contain at least 8 characters")
  if (input.correlationId.trim().length < 8) throw new Error("correlationId must contain at least 8 characters")
}

function assertPositive(amountMinor: bigint): void {
  if (amountMinor <= 0n) throw new Error("amountMinor must be positive")
}

function fingerprint(value: Record<string, string>): string {
  return Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${key}:${item}`).join("|")
}

function freezeTransaction(transaction: LedgerTransaction): LedgerTransaction {
  const postings = Object.freeze(transaction.postings.map((posting) => Object.freeze({ ...posting })))
  return Object.freeze({ ...transaction, postings })
}

function createId(sequence: number): string {
  return `ltx_${sequence.toString().padStart(10, "0")}`
}

export function calculateAccountBalance(
  transactionsOrPostings: readonly LedgerTransaction[] | readonly LedgerPosting[],
  accountId: string,
  currency: Currency,
): bigint {
  const postings = transactionsOrPostings.flatMap((item) => "postings" in item ? item.postings : [item])
  return postings
    .filter((posting) => posting.accountId === accountId && posting.currency === currency)
    .reduce((sum, posting) => sum + (posting.side === "DEBIT" ? posting.amountMinor : -posting.amountMinor), 0n)
}

export class LedgerService {
  constructor(private readonly repository: LedgerRepository) {}

  async issueMtrz(input: MtrzMutation): Promise<LedgerTransaction> {
    return this.postMtrz(input, "ISSUE", "DEBIT", "system:mtrz-issuance")
  }

  async withdrawMtrz(input: MtrzMutation): Promise<LedgerTransaction> {
    return this.postMtrz(input, "WITHDRAW", "CREDIT", "system:mtrz-issuance")
  }

  transferMtrz(input: TransferMutation): Promise<LedgerTransaction> {
    assertContext(input)
    assertPositive(input.amountMinor)
    if (input.sourceAccountId === input.destinationAccountId) throw new Error("Source and destination must differ")
    const requestFingerprint = fingerprint({
      actorId: input.actorId,
      amountMinor: input.amountMinor.toString(),
      correlationId: input.correlationId,
      destinationAccountId: input.destinationAccountId,
      kind: "TRANSFER",
      reason: input.reason,
      sourceAccountId: input.sourceAccountId,
    })
    return this.repository.executeAtomic(input.idempotencyKey, requestFingerprint, (transactions) => {
      if (calculateAccountBalance(transactions, input.sourceAccountId, "MTRZ") < input.amountMinor) throw new InsufficientFundsError()
      return freezeTransaction({
        id: createId(transactions.length + 1), kind: "TRANSFER", currency: "MTRZ", amountMinor: input.amountMinor,
        idempotencyKey: input.idempotencyKey, reason: input.reason.trim(), actorId: input.actorId,
        correlationId: input.correlationId, createdAt: new Date().toISOString(),
        postings: [
          { accountId: input.sourceAccountId, currency: "MTRZ", side: "CREDIT", amountMinor: input.amountMinor },
          { accountId: input.destinationAccountId, currency: "MTRZ", side: "DEBIT", amountMinor: input.amountMinor },
        ],
      })
    })
  }

  private postMtrz(
    input: MtrzMutation,
    kind: "ISSUE" | "WITHDRAW",
    userSide: PostingSide,
    counterpartyAccountId: string,
  ): Promise<LedgerTransaction> {
    assertContext(input)
    assertPositive(input.amountMinor)
    const requestFingerprint = fingerprint({
      actorId: input.actorId,
      amountMinor: input.amountMinor.toString(),
      correlationId: input.correlationId,
      kind,
      reason: input.reason,
      walletAccountId: input.walletAccountId,
    })
    return this.repository.executeAtomic(input.idempotencyKey, requestFingerprint, (transactions) => {
      if (userSide === "CREDIT" && calculateAccountBalance(transactions, input.walletAccountId, "MTRZ") < input.amountMinor) {
        throw new InsufficientFundsError()
      }
      const counterpartySide: PostingSide = userSide === "DEBIT" ? "CREDIT" : "DEBIT"
      return freezeTransaction({
        id: createId(transactions.length + 1),
        kind,
        currency: "MTRZ",
        amountMinor: input.amountMinor,
        idempotencyKey: input.idempotencyKey,
        reason: input.reason.trim(),
        actorId: input.actorId,
        correlationId: input.correlationId,
        createdAt: new Date().toISOString(),
        postings: [
          { accountId: input.walletAccountId, currency: "MTRZ", side: userSide, amountMinor: input.amountMinor },
          { accountId: counterpartyAccountId, currency: "MTRZ", side: counterpartySide, amountMinor: input.amountMinor },
        ],
      })
    })
  }

  reverse(input: ReversalMutation): Promise<LedgerTransaction> {
    assertContext(input)
    const requestFingerprint = fingerprint({
      actorId: input.actorId,
      correlationId: input.correlationId,
      kind: "REVERSAL",
      reason: input.reason,
      transactionId: input.transactionId,
    })
    return this.repository.executeAtomic(input.idempotencyKey, requestFingerprint, (transactions) => {
      const original = transactions.find((transaction) => transaction.id === input.transactionId)
      if (!original) throw new Error("Transaction not found")
      if (transactions.some((transaction) => transaction.reversesTransactionId === original.id)) {
        throw new Error("Transaction already reversed")
      }
      return freezeTransaction({
        id: createId(transactions.length + 1),
        kind: "REVERSAL",
        currency: original.currency,
        amountMinor: original.amountMinor,
        idempotencyKey: input.idempotencyKey,
        reason: input.reason.trim(),
        actorId: input.actorId,
        correlationId: input.correlationId,
        reversesTransactionId: original.id,
        createdAt: new Date().toISOString(),
        postings: original.postings.map((posting) => ({
          ...posting,
          side: posting.side === "DEBIT" ? "CREDIT" : "DEBIT",
        })),
      })
    })
  }

  async balance(accountId: string, currency: Currency): Promise<bigint> {
    return calculateAccountBalance(await this.repository.list(), accountId, currency)
  }
}
