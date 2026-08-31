export const dynamic = "force-dynamic"
export async function GET() {
  const hubUrl = process.env.MATRIZ_HUB_URL?.trim()
  let hub: "available" | "not_configured" | "unavailable" = hubUrl ? "unavailable" : "not_configured"
  if (hubUrl) {
    try { hub = (await fetch(`${hubUrl.replace(/\/$/, "")}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(2_000) })).ok ? "available" : "unavailable" }
    catch { hub = "unavailable" }
  }
  return Response.json({ app: "matriz-client-admin", status: "available", degraded: hub !== "available", dependencies: { hub } }, { headers: { "cache-control": "no-store" } })
}
