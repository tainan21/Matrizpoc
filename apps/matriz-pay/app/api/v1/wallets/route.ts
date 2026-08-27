import { listWalletSummaries } from "../../../../src/server/wallet-service"
import { requireOpsService } from "../../../../src/server/service-auth"
export async function GET(request: Request) {
  try { requireOpsService(request) } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }) }
  return Response.json({ contractVersion: "v1", wallets: await listWalletSummaries() })
}
