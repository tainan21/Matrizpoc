import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { bootstrapMatrizHub } from "../../bootstrap"
import { presentAppContract, type AppContractVM } from "./structure-presenter"

export function loadAppContracts(): readonly AppContractVM[] {
  bootstrapMatrizHub()
  return getGlobalRegistry().listEnabled().map((entry) => presentAppContract({
    appId: entry.appId,
    name: entry.manifest.name,
    description: entry.manifest.description,
    version: entry.manifest.version,
    contractVersion: entry.manifest.contractVersion,
    baseUrl: entry.baseUrl,
    enabled: entry.enabled,
    routes: entry.manifest.routes.map((route) => ({ label: route.label, path: route.path })),
    capabilities: entry.manifest.capabilities.map((capability) => ({
      id: capability.id,
      name: capability.name,
      description: capability.description,
    })),
    eventsProduced: entry.manifest.eventsProduced,
    eventsConsumed: entry.manifest.eventsConsumed,
    integrationsCount: entry.manifest.integrations.length,
    domainSummary: entry.manifest.ownership.domainSummary,
  }))
}
