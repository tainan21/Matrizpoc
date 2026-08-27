import { describe, expect, it } from "vitest"
import type { ProjectManifest } from "@matriz/integration-api-contracts/v1/institutional"
import { toProjectDetailVM } from "../../apps/matriz-hub/src/institutional/presenters"
import { runInstitutionalIngestion } from "../../apps/matriz-hub/src/institutional/bootstrap"

const project: ProjectManifest = {
  projectId: "matriz:spot",
  displayName: "Spot",
  sourceType: "internal_monorepo_app",
  trustLevel: "core",
  ingestMode: "local_contract_import",
  contractVersion: "v1",
  brand: { brandName: "Spot", primaryColor: "#111827", tone: "product" },
  capabilities: { produces: [], consumes: [], exposes: [], requires: [] },
  health: {
    status: "unknown",
    readinessScore: 0,
    lastCheckAt: "2026-08-04T12:00:00.000Z",
    checks: [],
    observation: {
      sourceId: "local:matriz-monorepo",
      nature: "declared",
      collectedAt: "2026-08-04T12:00:00.000Z",
      freshness: "unknown",
      confidence: "unverified",
    },
  },
  institutionalTags: [],
  ownership: { owner: "matriz-spot" },
  links: [],
  ingestedAt: "2026-08-04T12:00:00.000Z",
}

describe("institutional project presenter", () => {
  it("exposes provenance so declared health cannot look observed", () => {
    const vm = toProjectDetailVM(project)

    expect(vm.healthObservation).toEqual({
      sourceId: "local:matriz-monorepo",
      nature: "declared",
      natureLabel: "Declarativo",
      freshness: "unknown",
      freshnessLabel: "Frescor desconhecido",
      confidence: "unverified",
      confidenceLabel: "Nao verificado",
      collectedAt: "2026-08-04T12:00:00.000Z",
      observedAt: undefined,
      expiresAt: undefined,
      lastError: undefined,
    })
  })
})

describe("Hub institutional ingestion honesty", () => {
  it("does not publish simulated internal metrics as current project metrics", async () => {
    const report = await runInstitutionalIngestion()
    const internalProjects = report.run.projects.filter(
      (item) => item.sourceType === "internal_monorepo_app",
    )

    expect(internalProjects).toHaveLength(9)
    expect(internalProjects.map((item) => item.projectId).sort()).toEqual([
      "matriz:admin",
      "matriz:contracts",
      "matriz:hub",
      "matriz:matrizlib",
      "matriz:seumei",
      "matriz:sites",
      "matriz:spot",
      "matriz:willdash",
      "matriz:workbench",
    ])
    expect(internalProjects.every((item) => item.health.status === "unknown")).toBe(true)
    expect(internalProjects.every((item) => item.metrics === undefined)).toBe(true)
    expect(internalProjects.every((item) => item.telemetry === undefined)).toBe(true)
  })
})
