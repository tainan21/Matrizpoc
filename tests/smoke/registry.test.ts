/**
 * Smoke test — registry (L8).
 *
 * Valida que o Registry ingere os 5 manifests reais e expoe os lookups usados
 * pelo Hub (findByCapability, findByEventProduced, findByEventConsumed,
 * findByIntegrationTarget, findWithOnboardingSupport, toNavigation).
 */
import { describe, it, expect, beforeEach } from "vitest"
import { createRegistry, type Registry } from "@matriz/integration-registry-core"
import { monorepoConfig } from "@matriz/platform-config"
import { manifest as hubManifest } from "@apps/matriz-hub/public-contract"
import { manifest as matrizlibManifest } from "@apps/matrizlib/public-contract"
import { manifest as workbenchManifest } from "@apps/matriz-workbench/public-contract"
import { manifest as sitesManifest } from "@apps/sites/public-contract"
import { manifest as spotManifest } from "@apps/spot/public-contract"
import { manifest as seumeiManifest } from "@apps/seumei/public-contract"
import { manifest as contractsManifest } from "@apps/contracts/public-contract"
import { manifest as willdashManifest } from "@apps/willdash/public-contract"

const allManifests = [
  hubManifest,
  matrizlibManifest,
  workbenchManifest,
  sitesManifest,
  spotManifest,
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

  it("registra todos os 8 apps", () => {
    const ids = registry.listEnabled().map((e) => e.manifest.appId)
    expect(ids).toHaveLength(8)
    expect(new Set(ids)).toEqual(
      new Set(["matriz-hub", "matrizlib", "matriz-workbench", "sites", "spot", "seumei", "contracts", "willdash"]),
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

  it("findByIntegrationTarget('contracts') inclui spot e seumei", () => {
    const integrados = registry.findByIntegrationTarget("contracts")
    const ids = integrados.map((e) => e.appId).sort()
    expect(ids).toContain("spot")
    expect(ids).toContain("seumei")
  })

  it("findWithOnboardingSupport retorna todos os 8 apps", () => {
    const supporting = registry.findWithOnboardingSupport()
    expect(supporting.map((e) => e.appId).sort()).toEqual(
      ["contracts", "matriz-hub", "matriz-workbench", "matrizlib", "seumei", "sites", "spot", "willdash"],
    )
  })

  it("toNavigation produz SharedAppNavigationDTO valido", () => {
    const nav = registry.toNavigation()
    expect(nav).toHaveLength(8)
    for (const item of nav) {
      expect(item.routes.length).toBeGreaterThan(0)
      expect(item.primaryRoute).toMatch(/^\//)
      expect(item.baseUrl).toMatch(/^http/)
    }
  })

  it("registra matrizlib com a baseUrl oficial", () => {
    expect(registry.get("matrizlib")?.baseUrl).toBe("http://localhost:3007")
  })
})
