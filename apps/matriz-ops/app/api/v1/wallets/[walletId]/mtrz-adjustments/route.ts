import { z } from "zod"
import { walletAdjustmentInputSchema } from "@matriz/integration-wallet-contracts"
import { opsErrorResponse, runOpsMutation } from "../../../../../../src/server/ops-action"
const schema = walletAdjustmentInputSchema.extend({ confirmation: z.literal("CONFIRMAR") })
export async function POST(request: Request, context: { params: Promise<{ walletId: string }> }) {
  try {
    const walletId = (await context.params).walletId; const body = schema.parse(await request.json()); const idempotencyKey = request.headers.get("idempotency-key")
    if (!idempotencyKey) return Response.json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 })
    const result = await runOpsMutation({ request, body, action: "wallet.adjust", targetType: "wallet", targetId: walletId, mutate: async (actorUserId) => {
      const base = process.env.MATRIZ_PAY_INTERNAL_URL ?? "http://127.0.0.1:3010"; const token = process.env.MATRIZ_OPS_SERVICE_TOKEN; if (!token) throw new Error("PAY_SERVICE_NOT_CONFIGURED")
      const response = await fetch(`${base}/api/v1/wallets/${encodeURIComponent(walletId)}/mtrz-adjustments`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}`, "x-matriz-actor-id": actorUserId, "idempotency-key": idempotencyKey }, body: JSON.stringify({ amount: body.amount, direction: body.direction, reason: body.reason, correlationId: body.correlationId }) })
      const payload = await response.json(); if (!response.ok) throw new Error((payload as { error?: string }).error ?? "PAY_ERROR")
      return { before: { walletId }, after: payload, result: payload }
    } })
    return Response.json(result, { status: 201 })
  } catch (error) { return opsErrorResponse(error) }
}
