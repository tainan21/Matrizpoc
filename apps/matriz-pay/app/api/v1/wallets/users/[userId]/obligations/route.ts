import { walletObligations } from "../../../../../../../src/server/wallet-service"
import { requireOpsService } from "../../../../../../../src/server/service-auth"
export async function GET(request: Request, context: { params: Promise<{ userId: string }> }) {
  try { requireOpsService(request) } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }) }
  const obligations = await walletObligations((await context.params).userId)
  return obligations ? Response.json(obligations) : Response.json({ error: "Wallet not found" }, { status: 404 })
}
