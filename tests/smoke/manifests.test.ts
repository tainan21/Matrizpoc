/**
 * Smoke test — manifests (L2 + L8).
 *
 * Valida que os 5 manifests reais (source of truth em apps/<x>/src/manifest/manifest.ts)
 * sao coerentes com o schema Zod AppManifestDTO de integration/api-contracts.
 * Acesso via `@apps/<app>/public-contract`, unico barrel permitido (L3).
 */
import { describe, it, expect } from "vitest"
import { appManifestSchema } from "@matriz/integration-api-contracts"
import { manifest as hubManifest } from "@apps/matriz-hub/public-contract"
import { manifest as spotManifest } from "@apps/spot/public-contract"
import { manifest as seumeiManifest } from "@apps/seumei/public-contract"
import { manifest as contractsManifest } from "@apps/contracts/public-contract"
import { manifest as willdashManifest } from "@apps/willdash/public-contract"

const allManifests = [
  { appId: "matriz-hub", manifest: hubManifest },
  { appId: "spot", manifest: spotManifest },
  { appId: "seumei", manifest: seumeiManifest },
  { appId: "contracts", manifest: contractsManifest },
  { appId: "willdash", manifest: willdashManifest },
] as const

describe("manifests", () => {
  it("todos os 5 manifests satisfazem AppManifestDTO (Zod)", () => {
    for (const { appId, manifest } of allManifests) {
      const result = appManifestSchema.safeParse(manifest)
      if (!result.success) {
        throw new Error(
          `Manifest de "${appId}" invalido: ${JSON.stringify(result.error.issues, null, 2)}`,
        )
      }
      expect(result.success).toBe(true)
    }
  })

  it("cada manifest tem ao menos uma capability, uma rota e ownership", () => {
    for (const { manifest } of allManifests) {
      expect(manifest.capabilities.length).toBeGreaterThan(0)
      expect(manifest.routes.length).toBeGreaterThan(0)
      expect(manifest.ownership.domainSummary.length).toBeGreaterThan(0)
    }
  })

  it("contractVersion e v1 para todos na V1", () => {
    for (const { manifest } of allManifests) {
      expect(manifest.contractVersion).toBe("v1")
    }
  })

  it("primaryRoute aparece em routes", () => {
    for (const { appId, manifest } of allManifests) {
      const paths = manifest.routes.map((r) => r.path)
      expect(paths, `app "${appId}" precisa ter primaryRoute em routes`).toContain(
        manifest.primaryRoute,
      )
    }
  })

  it("hub consome eventos que pelo menos um outro app produz (ou flow de onboarding)", () => {
    const producedByOthers = new Set(
      allManifests
        .filter((a) => a.appId !== "matriz-hub")
        .flatMap((a) => a.manifest.eventsProduced),
    )
    for (const ev of hubManifest.eventsConsumed) {
      if (ev === "onboarding.completed") continue
      expect(producedByOthers, `hub consome ${ev} mas ninguem produz`).toContain(ev)
    }
  })

  it("apps com onboarding step nomeiam o titulo do step", () => {
    for (const { manifest } of allManifests) {
      if (manifest.onboardingSupport.hasSpecificStep) {
        expect(manifest.onboardingSupport.specificStepTitle).toBeTruthy()
      }
    }
  })

  it("contracts integra com spot e seumei via external-link", () => {
    const targets = contractsManifest.integrations
      .filter((i) => i.kind === "external-link")
      .map((i) => i.targetAppId)
    expect(targets).toContain("spot")
    expect(targets).toContain("seumei")
  })
})
