import { clientAdminDashboardSchema, type ClientAdminDashboard, type ClientAdminSection } from "@matriz/integration-api-contracts"

const PREFIX = "matriz-client-admin:dashboard:v1:"

export function writeCachedDashboard(storage: Pick<Storage, "setItem">, dashboard: ClientAdminDashboard): void {
  storage.setItem(`${PREFIX}${dashboard.tenant.id}`, JSON.stringify(dashboard))
}

export function readCachedDashboard(storage: Pick<Storage, "getItem">, tenantId: string): ClientAdminDashboard | null {
  const raw = storage.getItem(`${PREFIX}${tenantId}`)
  if (!raw) return null
  try {
    const parsed = clientAdminDashboardSchema.safeParse(JSON.parse(raw))
    if (!parsed.success || parsed.data.tenant.id !== tenantId) return null
    const stale = (section: ClientAdminSection): ClientAdminSection => ({ ...section, state: "stale", error: { code: "LOCAL_CACHE", message: "Exibindo a última informação disponível neste dispositivo." } })
    return { ...parsed.data, sections: { systems: stale(parsed.data.sections.systems), site: stale(parsed.data.sections.site), payments: stale(parsed.data.sections.payments), integrations: stale(parsed.data.sections.integrations) } }
  } catch { return null }
}

export function clearCachedDashboard(storage: Pick<Storage, "removeItem">, tenantId: string): void {
  storage.removeItem(`${PREFIX}${tenantId}`)
}
