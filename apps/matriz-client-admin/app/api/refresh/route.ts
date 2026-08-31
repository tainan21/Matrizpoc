import { cookies, headers } from "next/headers"
import { resolveSession } from "../../../src/auth/oidc.server"
import { refreshClientAdminDashboard } from "../../../src/integration/hub-client"

export const dynamic = "force-dynamic"
export async function POST() {
  try {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
    const host = headerStore.get("host") ?? "127.0.0.1:3013"
    const protocol = headerStore.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http")
    const auth = await resolveSession(new Request(`${protocol}://${host}/`, { headers: { cookie: cookieStore.toString() } }))
    if (!auth) return Response.json({ error: "Authentication required" }, { status: 401 })
    const dashboard = await refreshClientAdminDashboard({ hubUrl: process.env.MATRIZ_HUB_URL?.trim() || "http://127.0.0.1:3000", accessToken: auth.accessToken, tenantId: auth.context.tenantId })
    return Response.json(dashboard, { headers: { "cache-control": "private, no-store" } })
  } catch { return Response.json({ error: "Refresh unavailable" }, { status: 503 }) }
}
