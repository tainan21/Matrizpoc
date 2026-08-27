import { createHash } from "node:crypto"
import { Prisma } from "../../../../node_modules/.prisma/pay/index.js"
import { getPayDb } from "@matriz/platform-db/pay"
import type { BrlTransferIntentDTO, MtrzTransferInputDTO, WalletAdjustmentInputDTO, WalletReversalInputDTO } from "@matriz/integration-wallet-contracts"
import { evaluateReconciliationGate } from "../domain/reconciliation"

const SYSTEM_WALLET_ID = "wallet_system_mtrz"
const SYSTEM_ACCOUNT_ID = "account_system_mtrz"
const PROVIDER_WALLET_ID = "wallet_system_brl_provider"
const PROVIDER_ACCOUNT_ID = "account_system_brl_provider"
type WalletWithAccounts = Prisma.WalletGetPayload<{ include: { accounts: true } }>
type TransactionWithPostings = Prisma.LedgerTransactionGetPayload<{ include: { postings: true } }>
interface WalletSummary {
  readonly contractVersion: "v1"
  readonly walletId: string
  readonly userId: string
  readonly status: "ACTIVE" | "FROZEN" | "CLOSED"
  readonly accounts: readonly { readonly currency: "MTRZ" | "BRL"; readonly balance: { readonly currency: "MTRZ" | "BRL"; readonly amountMinor: string } }[]
}

function requestHash(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex")
}

export async function ensureWallet(userId: string): Promise<WalletWithAccounts> {
  return getPayDb().$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, accounts: { create: [{ currency: "MTRZ" }, { currency: "BRL" }] } },
      include: { accounts: true },
    })
    await tx.walletAccount.upsert({ where: { walletId_currency: { walletId: wallet.id, currency: "MTRZ" } }, update: {}, create: { walletId: wallet.id, currency: "MTRZ" } })
    await tx.walletAccount.upsert({ where: { walletId_currency: { walletId: wallet.id, currency: "BRL" } }, update: {}, create: { walletId: wallet.id, currency: "BRL" } })
    const systemWallet = await tx.wallet.upsert({
      where: { userId: "system:mtrz-issuance" },
      update: {},
      create: { id: SYSTEM_WALLET_ID, userId: "system:mtrz-issuance", accounts: { create: { id: SYSTEM_ACCOUNT_ID, currency: "MTRZ" } } },
    })
    await tx.walletAccount.upsert({ where: { walletId_currency: { walletId: systemWallet.id, currency: "MTRZ" } }, update: {}, create: { id: SYSTEM_ACCOUNT_ID, walletId: systemWallet.id, currency: "MTRZ" } })
    const providerWallet = await tx.wallet.upsert({ where: { userId: "system:brl-provider" }, update: {}, create: { id: PROVIDER_WALLET_ID, userId: "system:brl-provider", accounts: { create: { id: PROVIDER_ACCOUNT_ID, currency: "BRL" } } } })
    await tx.walletAccount.upsert({ where: { walletId_currency: { walletId: providerWallet.id, currency: "BRL" } }, update: {}, create: { id: PROVIDER_ACCOUNT_ID, walletId: providerWallet.id, currency: "BRL" } })
    return tx.wallet.findUniqueOrThrow({ where: { id: wallet.id }, include: { accounts: true } })
  })
}

async function accountBalance(accountId: string): Promise<bigint> {
  const groups = await getPayDb().ledgerPosting.groupBy({ by: ["side"], where: { accountId }, _sum: { amountMinor: true } })
  return groups.reduce((sum, group) => sum + (group.side === "DEBIT" ? group._sum.amountMinor ?? 0n : -(group._sum.amountMinor ?? 0n)), 0n)
}

export async function walletSummaryForUser(userId: string): Promise<WalletSummary | null> {
  const wallet = await getPayDb().wallet.findUnique({ where: { userId }, include: { accounts: true } })
  if (!wallet) return null
  const accounts = await Promise.all(wallet.accounts.map(async (account) => ({
    currency: account.currency,
    balance: { currency: account.currency, amountMinor: (await accountBalance(account.id)).toString() },
  })))
  return { contractVersion: "v1" as const, walletId: wallet.id, userId: wallet.userId, status: wallet.status, accounts }
}

export async function postMtrzAdjustment(input: {
  walletId: string
  payload: WalletAdjustmentInputDTO
  idempotencyKey: string
  actorId: string
}): Promise<TransactionWithPostings> {
  const amountMinor = BigInt(input.payload.amount.amountMinor)
  const hash = requestHash({ walletId: input.walletId, ...input.payload })
  return getPayDb().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.walletId}))`
    const existing = await tx.ledgerTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { postings: true } })
    if (existing) {
      if (existing.requestHash !== hash) throw new Error("IDEMPOTENCY_CONFLICT")
      return existing
    }
    const account = await tx.walletAccount.findUnique({ where: { walletId_currency: { walletId: input.walletId, currency: "MTRZ" } } })
    if (!account) throw new Error("WALLET_NOT_FOUND")
    if (input.payload.direction === "DEBIT") {
      const groups = await tx.ledgerPosting.groupBy({ by: ["side"], where: { accountId: account.id }, _sum: { amountMinor: true } })
      const balance = groups.reduce((sum, group) => sum + (group.side === "DEBIT" ? group._sum.amountMinor ?? 0n : -(group._sum.amountMinor ?? 0n)), 0n)
      if (balance < amountMinor) throw new Error("INSUFFICIENT_FUNDS")
    }
    const userSide = input.payload.direction === "CREDIT" ? "DEBIT" : "CREDIT"
    const systemSide = userSide === "DEBIT" ? "CREDIT" : "DEBIT"
    const transaction = await tx.ledgerTransaction.create({
      data: {
        walletId: input.walletId,
        kind: input.payload.direction === "CREDIT" ? "ISSUE" : "WITHDRAW",
        status: "POSTED", currency: "MTRZ", amountMinor,
        idempotencyKey: input.idempotencyKey, requestHash: hash, reason: input.payload.reason,
        actorId: input.actorId, correlationId: input.payload.correlationId, postedAt: new Date(),
        postings: { create: [
          { accountId: account.id, currency: "MTRZ", side: userSide, amountMinor },
          { accountId: SYSTEM_ACCOUNT_ID, currency: "MTRZ", side: systemSide, amountMinor },
        ] },
      }, include: { postings: true },
    })
    await tx.payOutboxEvent.create({ data: {
      transactionId: transaction.id, eventName: "wallet.entry.posted",
      payloadJson: { contractVersion: "v1", transactionId: transaction.id, walletId: input.walletId, currency: "MTRZ", amountMinor: amountMinor.toString(), correlationId: input.payload.correlationId },
    } })
    return transaction
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function listWalletTransactions(walletId: string): Promise<TransactionWithPostings[]> {
  return getPayDb().ledgerTransaction.findMany({ where: { walletId }, orderBy: { createdAt: "desc" }, take: 100, include: { postings: true } })
}

export interface WalletTransactionView {
  readonly contractVersion: "v1"
  readonly transactionId: string
  readonly walletId: string | null
  readonly kind: "ISSUE" | "WITHDRAW" | "TRANSFER" | "REVERSAL" | "BRL_CASH_IN" | "BRL_CASH_OUT"
  readonly status: "PENDING" | "POSTED" | "REVERSED" | "FAILED"
  readonly amount: { readonly currency: "MTRZ" | "BRL"; readonly amountMinor: string }
  readonly correlationId: string
  readonly providerReference: string | null
  readonly reversesTransactionId: string | null
  readonly createdAt: string
  readonly postedAt: string | null
}

export function walletTransactionView(transaction: TransactionWithPostings): WalletTransactionView {
  return {
    contractVersion: "v1" as const,
    transactionId: transaction.id,
    walletId: transaction.walletId,
    kind: transaction.kind,
    status: transaction.status,
    amount: { currency: transaction.currency, amountMinor: transaction.amountMinor.toString() },
    correlationId: transaction.correlationId,
    providerReference: transaction.providerReference,
    reversesTransactionId: transaction.reversesTransactionId,
    createdAt: transaction.createdAt.toISOString(),
    postedAt: transaction.postedAt?.toISOString() ?? null,
  }
}

async function balanceInTransaction(tx: Prisma.TransactionClient, accountId: string): Promise<bigint> {
  const groups = await tx.ledgerPosting.groupBy({ by: ["side"], where: { accountId }, _sum: { amountMinor: true } })
  return groups.reduce((sum, group) => sum + (group.side === "DEBIT" ? group._sum.amountMinor ?? 0n : -(group._sum.amountMinor ?? 0n)), 0n)
}

export async function postMtrzTransfer(input: { walletId: string; payload: MtrzTransferInputDTO; idempotencyKey: string; actorId: string }): Promise<TransactionWithPostings> {
  const destination = await ensureWallet(input.payload.destinationUserId)
  if (destination.id === input.walletId) throw new Error("SAME_WALLET_TRANSFER")
  const amountMinor = BigInt(input.payload.amount.amountMinor)
  const hash = requestHash({ walletId: input.walletId, ...input.payload })
  return getPayDb().$transaction(async (tx) => {
    for (const walletId of [input.walletId, destination.id].sort()) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${walletId}))`
    const existing = await tx.ledgerTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { postings: true } })
    if (existing) { if (existing.requestHash !== hash) throw new Error("IDEMPOTENCY_CONFLICT"); return existing }
    const [source, target] = await Promise.all([
      tx.walletAccount.findUnique({ where: { walletId_currency: { walletId: input.walletId, currency: "MTRZ" } } }),
      tx.walletAccount.findUnique({ where: { walletId_currency: { walletId: destination.id, currency: "MTRZ" } } }),
    ])
    if (!source || !target) throw new Error("WALLET_NOT_FOUND")
    if (await balanceInTransaction(tx, source.id) < amountMinor) throw new Error("INSUFFICIENT_FUNDS")
    const transaction = await tx.ledgerTransaction.create({ data: { walletId: input.walletId, kind: "TRANSFER", status: "POSTED", currency: "MTRZ", amountMinor, idempotencyKey: input.idempotencyKey, requestHash: hash, reason: input.payload.reason, actorId: input.actorId, correlationId: input.payload.correlationId, postedAt: new Date(), postings: { create: [
      { accountId: source.id, currency: "MTRZ", side: "CREDIT", amountMinor },
      { accountId: target.id, currency: "MTRZ", side: "DEBIT", amountMinor },
    ] } }, include: { postings: true } })
    await tx.payOutboxEvent.create({ data: { transactionId: transaction.id, eventName: "wallet.entry.posted", payloadJson: { contractVersion: "v1", transactionId: transaction.id, walletId: input.walletId, destinationWalletId: destination.id, currency: "MTRZ", amountMinor: amountMinor.toString(), correlationId: input.payload.correlationId } } })
    return transaction
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function reverseWalletTransaction(input: { walletId: string; transactionId: string; payload: WalletReversalInputDTO; idempotencyKey: string; actorId: string }): Promise<TransactionWithPostings> {
  const hash = requestHash({ walletId: input.walletId, transactionId: input.transactionId, ...input.payload })
  return getPayDb().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.walletId}))`
    const existing = await tx.ledgerTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { postings: true } })
    if (existing) { if (existing.requestHash !== hash) throw new Error("IDEMPOTENCY_CONFLICT"); return existing }
    const original = await tx.ledgerTransaction.findFirst({ where: { id: input.transactionId, walletId: input.walletId, status: "POSTED" }, include: { postings: true } })
    if (!original) throw new Error("TRANSACTION_NOT_FOUND")
    if (await tx.ledgerTransaction.findUnique({ where: { reversesTransactionId: original.id } })) throw new Error("TRANSACTION_ALREADY_REVERSED")
    for (const posting of original.postings.filter((item) => item.side === "DEBIT" && item.accountId !== SYSTEM_ACCOUNT_ID && item.accountId !== PROVIDER_ACCOUNT_ID)) {
      if (await balanceInTransaction(tx, posting.accountId) < posting.amountMinor) throw new Error("INSUFFICIENT_FUNDS")
    }
    const reversal = await tx.ledgerTransaction.create({ data: { walletId: input.walletId, kind: "REVERSAL", status: "POSTED", currency: original.currency, amountMinor: original.amountMinor, idempotencyKey: input.idempotencyKey, requestHash: hash, reason: input.payload.reason, actorId: input.actorId, correlationId: input.payload.correlationId, reversesTransactionId: original.id, postedAt: new Date(), postings: { create: original.postings.map((posting) => ({ accountId: posting.accountId, currency: posting.currency, side: posting.side === "DEBIT" ? "CREDIT" : "DEBIT", amountMinor: posting.amountMinor })) } }, include: { postings: true } })
    await tx.payOutboxEvent.create({ data: { transactionId: reversal.id, eventName: "wallet.entry.reversed", payloadJson: { contractVersion: "v1", transactionId: reversal.id, reversesTransactionId: original.id, walletId: input.walletId, correlationId: input.payload.correlationId } } })
    return reversal
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function createBrlIntent(input: { walletId: string; payload: BrlTransferIntentDTO; idempotencyKey: string; actorId: string }): Promise<TransactionWithPostings> {
  const amountMinor = BigInt(input.payload.amount.amountMinor)
  const hash = requestHash({ walletId: input.walletId, ...input.payload })
  return getPayDb().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.walletId}))`
    const existing = await tx.ledgerTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { postings: true } })
    if (existing) { if (existing.requestHash !== hash) throw new Error("IDEMPOTENCY_CONFLICT"); return existing }
    const [openDiscrepancies, lastRun] = await Promise.all([
      tx.reconciliationDiscrepancy.count({ where: { status: "OPEN", OR: [{ walletId: input.walletId }, { walletId: null }] } }),
      tx.reconciliationRun.findFirst({ orderBy: { startedAt: "desc" }, select: { status: true, finishedAt: true } }),
    ])
    const maxAgeMs = Math.max(60, Number(process.env.PAY_RECONCILIATION_MAX_AGE_SECONDS ?? 900)) * 1000
    if (evaluateReconciliationGate({ lastRun, openDiscrepancies, now: new Date(), maxAgeMs }).outgoingTransfersBlocked) throw new Error("RECONCILIATION_DIVERGENCE")
    const account = await tx.walletAccount.findUnique({ where: { walletId_currency: { walletId: input.walletId, currency: "BRL" } } })
    if (!account) throw new Error("WALLET_NOT_FOUND")
    const pending = await tx.ledgerTransaction.aggregate({ where: { walletId: input.walletId, kind: "BRL_CASH_OUT", status: "PENDING" }, _sum: { amountMinor: true } })
    if (await balanceInTransaction(tx, account.id) - (pending._sum.amountMinor ?? 0n) < amountMinor) throw new Error("INSUFFICIENT_FUNDS")
    return tx.ledgerTransaction.create({ data: { walletId: input.walletId, kind: "BRL_CASH_OUT", status: "PENDING", currency: "BRL", amountMinor, idempotencyKey: input.idempotencyKey, requestHash: hash, reason: input.payload.reason, actorId: input.actorId, correlationId: input.payload.correlationId }, include: { postings: true } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function walletObligations(userId: string) {
  const wallet = await getPayDb().wallet.findUnique({ where: { userId }, include: { accounts: true } })
  if (!wallet) return null
  const brl = wallet.accounts.find((account) => account.currency === "BRL")
  const [brlBalanceMinor, pendingFinancialOperations, openDisputes] = await Promise.all([
    brl ? accountBalance(brl.id) : 0n,
    getPayDb().ledgerTransaction.count({ where: { walletId: wallet.id, status: "PENDING" } }),
    getPayDb().reconciliationDiscrepancy.count({ where: { walletId: wallet.id, status: "OPEN" } }),
  ])
  return { brlBalanceMinor: brlBalanceMinor.toString(), pendingFinancialOperations, openDisputes, auditHold: false }
}

export interface WalletListItem {
  readonly contractVersion: "v1"
  readonly walletId: string
  readonly userId: string
  readonly status: "ACTIVE" | "FROZEN" | "CLOSED"
  readonly createdAt: string
  readonly accounts: readonly { readonly currency: "MTRZ" | "BRL"; readonly balance: { readonly currency: "MTRZ" | "BRL"; readonly amountMinor: string } }[]
}
export async function listWalletSummaries(limit = 200): Promise<WalletListItem[]> {
  const wallets = await getPayDb().wallet.findMany({ where: { NOT: { userId: { startsWith: "system:" } } }, include: { accounts: true }, orderBy: { createdAt: "desc" }, take: Math.min(limit, 500) })
  const accountIds = wallets.flatMap((wallet) => wallet.accounts.map((account) => account.id))
  const postings = accountIds.length ? await getPayDb().ledgerPosting.groupBy({ by: ["accountId", "side"], where: { accountId: { in: accountIds } }, _sum: { amountMinor: true } }) : []
  const balances = new Map<string, bigint>()
  for (const posting of postings) balances.set(posting.accountId, (balances.get(posting.accountId) ?? 0n) + (posting.side === "DEBIT" ? posting._sum.amountMinor ?? 0n : -(posting._sum.amountMinor ?? 0n)))
  return wallets.map((wallet) => ({ contractVersion: "v1", walletId: wallet.id, userId: wallet.userId, status: wallet.status, createdAt: wallet.createdAt.toISOString(), accounts: wallet.accounts.map((account) => ({ currency: account.currency, balance: { currency: account.currency, amountMinor: (balances.get(account.id) ?? 0n).toString() } })) }))
}
