import type { ClientAdminDashboard } from "@matriz/integration-api-contracts"

type Section = "overview" | "systems" | "site" | "payments" | "integrations"
type Actor = Readonly<{ tenantId: string; tenantName: string; capabilities: readonly string[] }>
type Service = Readonly<{ dashboard(input: { tenantId: string; tenantName: string }): Promise<ClientAdminDashboard>; refresh(input: { tenantId: string; tenantName: string }): Promise<ClientAdminDashboard> }>

export function createClientAdminHttpHandler(input: { resolveActor(request: Request): Promise<Actor | null>; service: Service }) {
  return async (request: Request, sectionName: Section): Promise<Response> => {
    try {
      const actor = await input.resolveActor(request)
      if (!actor) return Response.json({ error: "Authentication required" }, { status: 401, headers: { "cache-control": "private, no-store" } })
      if (!actor.capabilities.includes("client-admin.dashboard.read")) return Response.json({ error: "Access denied" }, { status: 403, headers: { "cache-control": "private, no-store" } })
      const isRefresh = request.method === "POST"
      if (isRefresh && !actor.capabilities.includes("client-admin.refresh")) return Response.json({ error: "Access denied" }, { status: 403, headers: { "cache-control": "private, no-store" } })
      const dashboard = isRefresh ? await input.service.refresh({ tenantId: actor.tenantId, tenantName: actor.tenantName }) : await input.service.dashboard({ tenantId: actor.tenantId, tenantName: actor.tenantName })
      const body = sectionName === "overview" ? dashboard : dashboard.sections[sectionName]
      return Response.json(body, { headers: { "cache-control": "private, no-store", "vary": "cookie, authorization" } })
    } catch {
      return Response.json({ error: "Client Admin temporarily unavailable" }, { status: 503, headers: { "cache-control": "private, no-store" } })
    }
  }
}
