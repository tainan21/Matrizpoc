type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export async function resolveClientAdminBearerActor(request: Request, input: { issuer: string; fetcher?: Fetcher }) {
  const bearer = /^Bearer (\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1]
  const requestedTenantId = request.headers.get("x-matriz-tenant-id")
  if (!bearer || !requestedTenantId) return null
  try {
    const response = await (input.fetcher ?? fetch)(`${input.issuer.replace(/\/$/, "")}/api/access/exchange`, {
      method: "POST",
      headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
      body: JSON.stringify({ tenantId: requestedTenantId }),
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    })
    if (!response.ok) return null
    const value = await response.json() as { context?: { tenantId?: string; appId?: string; capabilities?: string[] }; eligibleTenants?: { tenantId: string; tenantName: string }[] }
    if (value.context?.appId !== "matriz-client-admin" || value.context.tenantId !== requestedTenantId) return null
    const tenant = value.eligibleTenants?.find((candidate) => candidate.tenantId === value.context?.tenantId)
    if (!tenant) return null
    return { tenantId: tenant.tenantId, tenantName: tenant.tenantName, capabilities: value.context.capabilities ?? [] }
  } catch { return null }
}
