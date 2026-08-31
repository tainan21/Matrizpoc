import { getDurableHubRequestContext } from "../../auth/hub-session"
import { GarnetHubCacheRepository, loadGarnetCacheConfiguration } from "../../ecosystem/garnet-cache-repository"
import { createClientAdminService } from "./application"
import { resolveClientAdminBearerActor } from "./access"
import { createClientAdminHttpHandler } from "./http"
import { createClientAdminDashboardCache } from "./integration/garnet-dashboard-cache"
import { createMemoryClientAdminRepository } from "./integration/memory-repository"
import { createPrismaClientAdminRepository } from "./integration/prisma-repository"

function createRuntime() {
  const repository = process.env.HUB_DATABASE_URL ? createPrismaClientAdminRepository() : createMemoryClientAdminRepository()
  let cache
  try { cache = createClientAdminDashboardCache(new GarnetHubCacheRepository(loadGarnetCacheConfiguration(process.env))) } catch { cache = undefined }
  const service = createClientAdminService({ repository, cache })
  return createClientAdminHttpHandler({
    service,
    async resolveActor(request) {
      const bearerActor = await resolveClientAdminBearerActor(request, { issuer: process.env.MATRIZ_IDENTITY_ISSUER ?? "" })
      if (bearerActor) return bearerActor
      const context = await getDurableHubRequestContext(request)
      const tenant = context.session.identity.tenants.find((candidate) => candidate.tenantId === context.session.activeTenantId)
      if (!tenant) return null
      return {
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        capabilities: context.authorizationContext?.capabilities ?? (tenant.roles.includes("owner") ? ["client-admin.dashboard.read"] : []),
      }
    },
  })
}

let runtime: ReturnType<typeof createRuntime> | undefined
export function clientAdminHttpHandler() { return runtime ??= createRuntime() }
