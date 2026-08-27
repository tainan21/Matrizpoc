import { walletReversalInputSchema } from "@matriz/integration-wallet-contracts"
import { reverseWalletTransaction, walletTransactionView } from "../../../../../../../../src/server/wallet-service"
import { requireOpsService } from "../../../../../../../../src/server/service-auth"
export async function POST(request: Request, context: { params: Promise<{ walletId: string; transactionId: string }> }) {
  try {
    const actorId = requireOpsService(request); const idempotencyKey = request.headers.get("idempotency-key"); if (!idempotencyKey) return Response.json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 })
    const params = await context.params; const transaction = await reverseWalletTransaction({ walletId: params.walletId, transactionId: params.transactionId, payload: walletReversalInputSchema.parse(await request.json()), idempotencyKey, actorId })
    return Response.json(walletTransactionView(transaction), { status: 201 })
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "PAY_ERROR" }, { status: 409 }) }
}
