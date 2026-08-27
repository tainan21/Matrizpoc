import { listWalletTransactions, walletTransactionView } from "../../../../../../src/server/wallet-service"
import { requireOpsService } from "../../../../../../src/server/service-auth"
export async function GET(request: Request, context: { params: Promise<{ walletId: string }> }) {
  try { requireOpsService(request) } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }) }
  const transactions = await listWalletTransactions((await context.params).walletId)
  return Response.json({ contractVersion: "v1", transactions: transactions.map(walletTransactionView) })
}
