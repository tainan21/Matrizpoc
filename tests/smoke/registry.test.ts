/**
 * Smoke test — registry (L8).
 *
 * Valida que o Registry ingere os 8 manifests reais e expoe os lookups usados
 * pelo Hub (findByCapability, findByEventProduced, findByEventConsumed,
 * findByIntegrationTarget, findWithOnboardingSupport, toNavigation).
 */
import { describe, it, expect, beforeEach } from "vitest"
import { createRegistry, type Registry } from "@matriz/integration-registry-core"
import { monorepoConfig } from "@matriz/platform-config"
import { manifest as hubManifest } from "@apps/matriz-hub/public-contract"
import { manifest as matrizlibManifest } from "@apps/matrizlib/public-contract"
import { manifest as desktopManifest } from "@apps/matriz-desktop/public-contract"
import { manifest as identityManifest } from "@apps/matriz-identity/public-contract"
import { manifest as workbenchManifest } from "@apps/matriz-workbench/public-contract"
import { manifest as controlManifest } from "@apps/matriz-control/public-contract"
import { manifest as uninstallManifest } from "@apps/matriz-uninstall/public-contract"
import { manifest as sitesManifest } from "@apps/sites/public-contract"
import { manifest as spotManifest } from "@apps/spot/public-contract"
import { manifest as matrizAdminManifest } from "@apps/matriz-admin/public-contract"
import { manifest as matrizOpsManifest } from "@apps/matriz-ops/public-contract"
import { manifest as matrizPayManifest } from "@apps/matriz-pay/public-contract"
import { manifest as seumeiManifest } from "@apps/seumei/public-contract"
import { manifest as contractsManifest } from "@apps/contracts/public-contract"
import { manifest as willdashManifest } from "@apps/willdash/public-contract"
import { manifest as healthManifest } from "@apps/health/public-contract"
import { manifest as clientAdminManifest } from "@apps/matriz-client-admin/public-contract"
import { bootstrapMatrizHub } from "../../apps/matriz-hub/src/bootstrap/index"

const allManifests = [
  identityManifest,
  hubManifest,
  matrizlibManifest,
  desktopManifest,
  workbenchManifest,
  controlManifest,
  uninstallManifest,
  sitesManifest,
  spotManifest,
  matrizAdminManifest,
  matrizOpsManifest,
  matrizPayManifest,
  seumeiManifest,
  contractsManifest,
  willdashManifest,
  healthManifest,
  clientAdminManifest,
]

function buildRegistry(): Registry {
  const registry = createRegistry()
  for (const m of allManifests) {
    registry.registerApp(m, {
      baseUrl: monorepoConfig.baseUrls[m.appId],
      enabled: true,
    })
  }
  return registry
}

describe("registry", () => {
  let registry: Registry

  beforeEach(() => {
    registry = buildRegistry()
  })

  it("registra todos os 17 apps", () => {
    const ids = registry.listEnabled().map((e) => e.manifest.appId)
    expect(ids).toHaveLength(17)
    expect(new Set(ids)).toContain("health")
    expect(new Set(ids)).toEqual(
      new Set(["matriz-identity", "matriz-hub", "matriz-desktop", "matrizlib", "matriz-workbench", "matriz-control", "matriz-uninstall", "sites", "spot", "matriz-admin", "matriz-client-admin", "matriz-ops", "matriz-pay", "seumei", "contracts", "willdash", "health"]),
    )
  })

  it("findByCapability retorna apps certos", () => {
    const createGig = registry.findByCapability("spot.gig.create")
    expect(createGig.map((e) => e.appId)).toEqual(["spot"])

    const fromGig = registry.findByCapability("contracts.contract.from-gig")
    expect(fromGig.map((e) => e.appId)).toEqual(["contracts"])
  })

  it("findByEventProduced / findByEventConsumed funcionam", () => {
    const producers = registry.findByEventProduced("spot.gig.created")
    expect(producers.map((e) => e.appId)).toEqual(["spot"])

    const consumers = registry.findByEventConsumed("spot.gig.created")
    expect(consumers.map((e) => e.appId).sort()).toContain("contracts")
  })

  it("findByIntegrationTarget('contracts') inclui spot e matriz-admin", () => {
    const integrados = registry.findByIntegrationTarget("contracts")
    const ids = integrados.map((e) => e.appId).sort()
    expect(ids).toContain("spot")
    expect(ids).toContain("matriz-admin")
  })

  it("findWithOnboardingSupport retorna os 11 apps participantes", () => {
    const supporting = registry.findWithOnboardingSupport()
    expect(supporting.map((e) => e.appId).sort()).toEqual(
      ["contracts", "health", "matriz-admin", "matriz-control", "matriz-hub", "matriz-workbench", "matrizlib", "seumei", "sites", "spot", "willdash"],
    )
  })

  it("toNavigation produz SharedAppNavigationDTO valido", () => {
    const nav = registry.toNavigation()
    expect(nav).toHaveLength(17)
    for (const item of nav) {
      expect(item.routes.length).toBeGreaterThan(0)
      expect(item.primaryRoute).toMatch(/^\//)
      expect(item.baseUrl).toMatch(/^(https?:\/\/|matriz:\/\/)/)
    }
  })

  it("registra matrizlib com a baseUrl oficial", () => {
    expect(registry.get("matrizlib")?.baseUrl).toBe("http://127.0.0.1:3007")
  })

  it("registra o desktop com protocolo local oficial", () => {
    expect(registry.get("matriz-desktop")?.baseUrl).toBe("matriz://control")
  })

  it("preserva Control em 3009 e registra Ops em 3011", () => {
    expect(registry.get("matriz-control")?.baseUrl).toBe("http://127.0.0.1:3009")
    expect(registry.get("matriz-ops")?.baseUrl).toBe("http://127.0.0.1:3011")
  })

  it("registra Health na porta 3010", () => {
    expect(registry.get("health")?.baseUrl).toBe("http://127.0.0.1:3010")
  })

  it("bootstrap real do Hub registra Matriz Identity, MatrizLib e Health", () => {
    const result = bootstrapMatrizHub()
    expect(result.registeredApps).toContain("matriz-identity")
    expect(result.registeredApps).toContain("matrizlib")
    expect(result.registeredApps).toContain("health")
    expect(result.registeredApps).toHaveLength(17)
    expect(monorepoConfig.baseUrls["matriz-identity"]).toBe("http://127.0.0.1:8080")
    expect(monorepoConfig.baseUrls.matrizlib).toBe("http://127.0.0.1:3007")
  })
})
