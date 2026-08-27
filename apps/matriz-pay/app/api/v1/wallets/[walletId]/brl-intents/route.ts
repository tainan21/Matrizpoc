import { brlTransferIntentSchema } from "@matriz/integration-wallet-contracts"
import { createBrlIntent, walletTransactionView } from "../../../../../../src/server/wallet-service"
import { requireOpsService } from "../../../../../../src/server/service-auth"
import { submitBrlIntent } from "../../../../../../src/server/brl-provider-service"
export async function POST(request: Request, context: { params: Promise<{ walletId: string }> }) {
  try {
    const actorId = requireOpsService(request); const idempotencyKey = request.headers.get("idempotency-key"); if (!idempotencyKey) return Response.json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 })
    const payload = brlTransferIntentSchema.parse(await request.json())
    const transaction = await createBrlIntent({ walletId: (await context.params).walletId, payload, idempotencyKey, actorId })
    const submitted = await submitBrlIntent(transaction.id, payload.pixKey)
    return Response.json(walletTransactionView({ ...transaction, providerReference: submitted.providerReference }), { status: 202 })
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "PAY_ERROR" }, { status: 409 }) }
}
