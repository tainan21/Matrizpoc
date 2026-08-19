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
import { manifest as workbenchManifest } from "@apps/matriz-workbench/public-contract"
import { manifest as sitesManifest } from "@apps/sites/public-contract"
import { manifest as spotManifest } from "@apps/spot/public-contract"
import { manifest as matrizAdminManifest } from "@apps/matriz-admin/public-contract"
import { manifest as seumeiManifest } from "@apps/seumei/public-contract"
import { manifest as contractsManifest } from "@apps/contracts/public-contract"
import { manifest as willdashManifest } from "@apps/willdash/public-contract"
import { bootstrapMatrizHub } from "../../apps/matriz-hub/src/bootstrap/index"

const allManifests = [
  hubManifest,
  matrizlibManifest,
  desktopManifest,
  workbenchManifest,
  sitesManifest,
  spotManifest,
  matrizAdminManifest,
  seumeiManifest,
  contractsManifest,
  willdashManifest,
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

  it("registra todos os 10 apps", () => {
    const ids = registry.listEnabled().map((e) => e.manifest.appId)
    expect(ids).toHaveLength(10)
    expect(new Set(ids)).toEqual(
      new Set(["matriz-hub", "matriz-desktop", "matrizlib", "matriz-workbench", "sites", "spot", "matriz-admin", "seumei", "contracts", "willdash"]),
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

  it("findWithOnboardingSupport retorna os 9 apps participantes", () => {
    const supporting = registry.findWithOnboardingSupport()
    expect(supporting.map((e) => e.appId).sort()).toEqual(
      ["contracts", "matriz-admin", "matriz-hub", "matriz-workbench", "matrizlib", "seumei", "sites", "spot", "willdash"],
    )
  })

  it("toNavigation produz SharedAppNavigationDTO valido", () => {
    const nav = registry.toNavigation()
    expect(nav).toHaveLength(10)
    for (const item of nav) {
      expect(item.routes.length).toBeGreaterThan(0)
      expect(item.primaryRoute).toMatch(/^\//)
      expect(item.baseUrl).toMatch(/^(https?:\/\/|matriz:\/\/)/)
    }
  })

  it("registra matrizlib com a baseUrl oficial", () => {
    expect(registry.get("matrizlib")?.baseUrl).toBe("http://localhost:3007")
  })

  it("registra o desktop com protocolo local oficial", () => {
    expect(registry.get("matriz-desktop")?.baseUrl).toBe("matriz://control")
  })

  it("bootstrap real do Hub registra matrizlib com a baseUrl oficial", () => {
    const result = bootstrapMatrizHub()
    expect(result.registeredApps).toContain("matrizlib")
    expect(result.registeredApps).toHaveLength(10)
    expect(monorepoConfig.baseUrls.matrizlib).toBe("http://localhost:3007")
  })
})
