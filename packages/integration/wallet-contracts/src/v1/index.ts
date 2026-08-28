import { z } from "zod"

export const WALLET_CONTRACT_VERSION = "v1" as const
export const walletCurrencySchema = z.enum(["MTRZ", "BRL"])
export type WalletCurrency = z.infer<typeof walletCurrencySchema>

const integerMinorUnits = z.string().regex(/^-?(0|[1-9]\d*)$/, "amountMinor must be an integer string")
const positiveMinorUnits = z.string().regex(/^[1-9]\d*$/, "amountMinor must be a positive integer string")

export const moneyAmountSchema = z.object({
  currency: walletCurrencySchema,
  amountMinor: integerMinorUnits,
})
export type MoneyAmountDTO = z.infer<typeof moneyAmountSchema>

export const walletSummarySchema = z.object({
  contractVersion: z.literal(WALLET_CONTRACT_VERSION),
  walletId: z.string().min(1),
  userId: z.string().min(1),
  accounts: z.array(z.object({ currency: walletCurrencySchema, balance: moneyAmountSchema })),
})
export type WalletSummaryDTO = z.infer<typeof walletSummarySchema>

export const walletTransactionSchema = z.object({
  contractVersion: z.literal(WALLET_CONTRACT_VERSION),
  transactionId: z.string().min(1),
  walletId: z.string().min(1),
  kind: z.enum(["ISSUE", "WITHDRAW", "TRANSFER", "REVERSAL", "BRL_CASH_IN", "BRL_CASH_OUT"]),
  status: z.enum(["PENDING", "POSTED", "REVERSED", "FAILED"]),
  amount: moneyAmountSchema,
  correlationId: z.string().min(8),
  createdAt: z.string().datetime(),
})
export type WalletTransactionDTO = z.infer<typeof walletTransactionSchema>

export const walletAdjustmentInputSchema = z.object({
  amount: z.object({ currency: z.literal("MTRZ"), amountMinor: positiveMinorUnits }),
  direction: z.enum(["CREDIT", "DEBIT"]),
  reason: z.string().trim().min(8).max(500),
  correlationId: z.string().min(8).max(128),
})
export type WalletAdjustmentInputDTO = z.infer<typeof walletAdjustmentInputSchema>

export const mtrzTransferInputSchema = z.object({
  destinationUserId: z.string().min(1),
  amount: z.object({ currency: z.literal("MTRZ"), amountMinor: positiveMinorUnits }),
  reason: z.string().trim().min(8).max(500),
  correlationId: z.string().min(8).max(128),
})
export type MtrzTransferInputDTO = z.infer<typeof mtrzTransferInputSchema>

export const walletReversalInputSchema = z.object({
  reason: z.string().trim().min(8).max(500),
  correlationId: z.string().min(8).max(128),
})
export type WalletReversalInputDTO = z.infer<typeof walletReversalInputSchema>

export const brlTransferIntentSchema = z.object({
  amount: z.object({ currency: z.literal("BRL"), amountMinor: positiveMinorUnits }),
  pixKey: z.string().min(3).max(140),
  reason: z.string().trim().min(8).max(500),
  correlationId: z.string().min(8).max(128),
})
export type BrlTransferIntentDTO = z.infer<typeof brlTransferIntentSchema>

export const reconciliationStatusSchema = z.object({
  contractVersion: z.literal(WALLET_CONTRACT_VERSION),
  status: z.enum(["NOT_RUN", "HEALTHY", "RUNNING", "DIVERGENT", "FAILED", "STALE"]),
  checkedAt: z.string().datetime().nullable(),
  openDiscrepancies: z.number().int().nonnegative(),
  outgoingTransfersBlocked: z.boolean(),
})
export type ReconciliationStatusDTO = z.infer<typeof reconciliationStatusSchema>

export const walletErrorCodeSchema = z.enum([
  "IDEMPOTENCY_CONFLICT",
  "INSUFFICIENT_FUNDS",
  "STEP_UP_REQUIRED",
  "PROVIDER_UNAVAILABLE",
  "RECONCILIATION_DIVERGENCE",
])
export type WalletErrorCode = z.infer<typeof walletErrorCodeSchema>
