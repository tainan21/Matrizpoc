import { requireOpsRequestPrincipal } from "../../../../../src/server/ops-session"
export async function GET(request: Request) {
  try { await requireOpsRequestPrincipal(request) } catch { return Response.json({ error: "OPS_UNAUTHORIZED" }, { status: 401 }) }
  const hub = process.env.MATRIZ_HUB_INTERNAL_URL ?? "http://127.0.0.1:3000"
  const token = process.env.MATRIZ_TELEMETRY_INGEST_TOKEN
  if (!token) return Response.json({ error: "HUB_SERVICE_NOT_CONFIGURED" }, { status: 503 })
  const response = await fetch(`${hub}/api/v1/telemetry/summary`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" })
  return new Response(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } })
}
