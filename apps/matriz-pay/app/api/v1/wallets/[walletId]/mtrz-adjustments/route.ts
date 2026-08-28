import { walletAdjustmentInputSchema } from "@matriz/integration-wallet-contracts"
import { postMtrzAdjustment } from "../../../../../../src/server/wallet-service"
import { requireOpsService } from "../../../../../../src/server/service-auth"

export async function POST(request: Request, context: { params: Promise<{ walletId: string }> }) {
  let actorId: string
  try { actorId = requireOpsService(request) } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }) }
  const idempotencyKey = request.headers.get("idempotency-key")
  if (!idempotencyKey) return Response.json({ error: "Idempotency-Key required" }, { status: 400 })
  try {
    const payload = walletAdjustmentInputSchema.parse(await request.json())
    const { walletId } = await context.params
    const transaction = await postMtrzAdjustment({ walletId, payload, idempotencyKey, actorId })
    return Response.json({ contractVersion: "v1", transactionId: transaction.id, status: transaction.status, amount: { currency: transaction.currency, amountMinor: transaction.amountMinor.toString() }, correlationId: transaction.correlationId, createdAt: transaction.createdAt.toISOString() })
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_REQUEST"
    const status = code === "INSUFFICIENT_FUNDS" ? 409 : code === "IDEMPOTENCY_CONFLICT" ? 409 : code === "WALLET_NOT_FOUND" ? 404 : 400
    return Response.json({ error: code }, { status })
  }
}
