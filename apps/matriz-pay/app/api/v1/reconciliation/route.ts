import { getPayDb } from "@matriz/platform-db/pay"
import { requireOpsService } from "../../../../src/server/service-auth"
import { runCelcoinReconciliation } from "../../../../src/server/reconciliation-service"
import { evaluateReconciliationGate } from "../../../../src/domain/reconciliation"

const maxAgeMs = () => Math.max(60, Number(process.env.PAY_RECONCILIATION_MAX_AGE_SECONDS ?? 900)) * 1000

export async function GET(request: Request) {
  try { requireOpsService(request) } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }) }
  const [lastRun, openDiscrepancies] = await Promise.all([
    getPayDb().reconciliationRun.findFirst({ orderBy: { startedAt: "desc" } }),
    getPayDb().reconciliationDiscrepancy.count({ where: { status: "OPEN" } }),
  ])
  const gate = evaluateReconciliationGate({ lastRun, openDiscrepancies, now: new Date(), maxAgeMs: maxAgeMs() })
  return Response.json({ contractVersion: "v1", status: gate.status, checkedAt: lastRun?.finishedAt?.toISOString() ?? null, openDiscrepancies, outgoingTransfersBlocked: gate.outgoingTransfersBlocked })
}

export async function POST(request: Request) {
  try { requireOpsService(request) } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }) }
  try { return Response.json(await runCelcoinReconciliation(), { status: 201 }) }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "RECONCILIATION_FAILED" }, { status: 503 }) }
}
