import "server-only"
import { cookies, headers } from "next/headers"
import { unavailableDashboard } from "../application/fallback-dashboard"
import { resolveSession } from "../auth/oidc.server"
import { fetchClientAdminDashboard } from "../integration/hub-client"

export async function loadDashboardPageData() {
  const fallbackId = process.env.CLIENT_ADMIN_FALLBACK_TENANT_ID?.trim() || "tenant-unavailable"
  const fallbackName = process.env.CLIENT_ADMIN_FALLBACK_TENANT_NAME?.trim() || "Cliente"
  try {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
    const host = headerStore.get("host") ?? "127.0.0.1:3013"
    const protocol = headerStore.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http")
    const auth = await resolveSession(new Request(`${protocol}://${host}/`, { headers: { cookie: cookieStore.toString(), traceparent: headerStore.get("traceparent") ?? "" } }))
    if (!auth) return unavailableDashboard(fallbackId, fallbackName)
    return await fetchClientAdminDashboard({ hubUrl: process.env.MATRIZ_HUB_URL?.trim() || "http://127.0.0.1:3000", accessToken: auth.accessToken, tenantId: auth.context.tenantId })
  } catch { return unavailableDashboard(fallbackId, fallbackName) }
}
