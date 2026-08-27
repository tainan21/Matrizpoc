import { ensureWallet, walletSummaryForUser } from "../../../../../../src/server/wallet-service"
import { requireOpsService } from "../../../../../../src/server/service-auth"

export async function GET(request: Request, context: { params: Promise<{ userId: string }> }) {
  try { requireOpsService(request) } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }) }
  const { userId } = await context.params
  const wallet = await walletSummaryForUser(userId)
  return wallet ? Response.json(wallet) : Response.json({ error: "Wallet not found" }, { status: 404 })
}

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  try { requireOpsService(request) } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }) }
  const { userId } = await context.params
  await ensureWallet(userId)
  return Response.json(await walletSummaryForUser(userId), { status: 201 })
}
