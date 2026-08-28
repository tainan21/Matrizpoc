import { z } from "zod"
import { anonymizeUser, changeUserStatus } from "./user-status"
import { canAnonymizeUser } from "../domain/operator-policy"
import { opsErrorResponse, runOpsMutation } from "./ops-action"

const bodySchema = z.object({ reason: z.string().trim().min(8).max(500), confirmation: z.literal("CONFIRMAR"), correlationId: z.string().min(8).max(128).optional() })

async function payObligations(userId: string) {
  const base = process.env.MATRIZ_PAY_INTERNAL_URL ?? "http://127.0.0.1:3010"
  const token = process.env.MATRIZ_OPS_SERVICE_TOKEN
  if (!token) throw new Error("PAY_SERVICE_NOT_CONFIGURED")
  const response = await fetch(`${base}/api/v1/wallets/users/${encodeURIComponent(userId)}/obligations`, { headers: { authorization: `Bearer ${token}`, "x-service-actor": "matriz-ops" }, cache: "no-store" })
  if (response.status === 404) return { brlBalanceMinor: 0n, pendingFinancialOperations: 0, openDisputes: 0, auditHold: false }
  if (!response.ok) throw new Error("PAY_OBLIGATIONS_UNAVAILABLE")
  const data = await response.json() as { brlBalanceMinor: string; pendingFinancialOperations: number; openDisputes: number; auditHold: boolean }
  return { ...data, brlBalanceMinor: BigInt(data.brlBalanceMinor) }
}

export async function handleUserStatusMutation(request: Request, userId: string, action: "suspend" | "restore" | "anonymize") {
  try {
    const body = bodySchema.parse(await request.json())
    if (action === "anonymize") {
      const decision = canAnonymizeUser(await payObligations(userId))
      if (!decision.allowed) return Response.json({ error: "ANONYMIZATION_BLOCKED", blockers: decision.blockers }, { status: 409 })
    }
    const result = await runOpsMutation({ request, body, action: "users.manage", targetType: "user", targetId: userId, mutate: async () => {
      const outcome = action === "anonymize" ? await anonymizeUser(userId) : await changeUserStatus(userId, action)
      return { ...outcome, result: outcome.after }
    } })
    return Response.json({ contractVersion: "v1", user: result })
  } catch (error) { return opsErrorResponse(error) }
}
