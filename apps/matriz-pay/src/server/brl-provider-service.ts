import { getPayDb } from "@matriz/platform-db/pay"
import { CelcoinAdapter } from "../providers/celcoin/celcoin-adapter"

function adapter() { return new CelcoinAdapter({ baseUrl: process.env.CELCOIN_BASE_URL ?? "https://sandbox.openfinance.celcoin.dev", clientId: process.env.CELCOIN_CLIENT_ID ?? "", clientSecret: process.env.CELCOIN_CLIENT_SECRET ?? "", productionApproved: process.env.CELCOIN_PRODUCTION_APPROVED === "true" }) }

function objectAt(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined
  const object = value as Record<string, unknown>
  const direct = object[key]
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct as Record<string, unknown>
  return object.body && typeof object.body === "object" ? objectAt(object.body, key) : undefined
}
function stringAt(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined
  for (const [name, item] of Object.entries(value as Record<string, unknown>)) {
    if (name.toLowerCase() === key.toLowerCase() && (typeof item === "string" || typeof item === "number")) return String(item)
    const nested = item && typeof item === "object" ? stringAt(item, key) : undefined
    if (nested) return nested
  }
  return undefined
}

export async function submitBrlIntent(transactionId: string, pixKey: string) {
  const transaction = await getPayDb().ledgerTransaction.findUnique({ where: { id: transactionId } })
  if (!transaction || transaction.kind !== "BRL_CASH_OUT" || !transaction.walletId) throw new Error("BRL_INTENT_NOT_FOUND")
  if (transaction.status !== "PENDING") return transaction
  const link = await getPayDb().providerAccountLink.findUnique({ where: { walletId_provider: { walletId: transaction.walletId, provider: "CELCOIN" } } })
  if (!link || link.kycStatus !== "APPROVED") throw new Error("CELCOIN_ACCOUNT_NOT_APPROVED")
  const celcoin = adapter()
  const dict = await celcoin.lookupExternalPixKey(pixKey)
  const account = objectAt(dict, "account"); const owner = objectAt(dict, "owner")
  if (!account || !owner) throw new Error("CELCOIN_DICT_RESPONSE_INVALID")
  const result = await celcoin.createPixOutMinor({
    clientCode: transaction.correlationId,
    initiationType: "DICT", paymentType: "IMMEDIATE", urgency: "HIGH", transactionType: "TRANSFER",
    endToEndId: stringAt(dict, "endToEndId") ?? stringAt(dict, "endtoendid"),
    debitParty: { account: link.providerAccountId },
    creditParty: { bank: account.participant, account: account.accountNumber ?? account.account, branch: account.branch, accountType: account.accountType, taxId: owner.taxIdNumber ?? owner.taxId, name: owner.name, key: pixKey },
    remittanceInformation: transaction.reason.slice(0, 140),
  }, transaction.amountMinor)
  const providerReference = stringAt(result, "id") ?? stringAt(result, "transactionId") ?? transaction.correlationId
  return getPayDb().ledgerTransaction.update({ where: { id: transaction.id }, data: { providerReference } })
}
