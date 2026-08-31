import { clientAdminDashboardSchema, type ClientAdminDashboard } from "@matriz/integration-api-contracts"
import type { HubCacheRepository } from "../../../ecosystem/garnet-cache-repository"
import type { ClientAdminDashboardCache } from "../ports"

const KEY = "client-admin-dashboard"

export function createClientAdminDashboardCache(cache: HubCacheRepository): ClientAdminDashboardCache {
  return {
    async read(tenantId) {
      const record = await cache.read(tenantId, "ecosystem", KEY)
      const parsed = clientAdminDashboardSchema.safeParse(record?.value)
      return parsed.success ? parsed.data : null
    },
    async write(tenantId, dashboard: ClientAdminDashboard) {
      await cache.write(tenantId, "ecosystem", { key: KEY, value: dashboard, updatedAt: dashboard.generatedAt, updatedBy: "matriz-hub:client-admin" }, 604_800)
    },
  }
}
