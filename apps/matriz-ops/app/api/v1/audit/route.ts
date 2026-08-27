import { getOpsDb } from "@matriz/platform-db/ops"
import { requireOpsRequestPrincipal } from "../../../../src/server/ops-session"
export async function GET(request: Request) {
  try { await requireOpsRequestPrincipal(request) } catch { return Response.json({ error: "OPS_UNAUTHORIZED" }, { status: 401 }) }
  const url = new URL(request.url); const targetId = url.searchParams.get("targetId") ?? undefined
  const events = await getOpsDb().opsAuditEvent.findMany({ where: targetId ? { targetId } : {}, orderBy: { occurredAt: "desc" }, take: 200 })
  return Response.json({ contractVersion: "v1", events: events.map((event) => ({ ...event, occurredAt: event.occurredAt.toISOString() })) })
}
