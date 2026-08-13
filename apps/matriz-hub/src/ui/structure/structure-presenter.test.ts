import { describe, expect, it } from "vitest"
import {
  presentAppContract,
  presentHealthState,
  presentProjectPortfolio,
} from "./structure-presenter"

describe("structure presenters", () => {
  it("orders project attention by health severity then readiness", () => {
    const result = presentProjectPortfolio([
      project({ projectId: "alpha", healthStatus: "healthy", readinessScore: 55 }),
      project({ projectId: "beta", healthStatus: "degraded", readinessScore: 71 }),
      project({ projectId: "gamma", healthStatus: "offline", readinessScore: 80 }),
    ])

    expect(result.map((item) => item.projectId)).toEqual(["gamma", "beta", "alpha"])
    expect(result[0]?.status).toBe("blocked")
  })

  it("keeps missing health signals explicit", () => {
    expect(presentHealthState("unknown")).toEqual(
      expect.objectContaining({ status: "unknown", label: "Sem sinal" }),
    )
  })

  it("presents manifest contracts without discarding technical names", () => {
    const contract = presentAppContract({
      appId: "matriz-hub",
      name: "Matriz Hub",
      description: "Centro",
      version: "0.1.0",
      contractVersion: "v1",
      baseUrl: "http://localhost:3000",
      enabled: true,
      routes: [{ label: "Início", path: "/" }],
      capabilities: [{ id: "hub.read", name: "Ler Hub", description: "Leitura" }],
      eventsProduced: ["hub.app.opened"],
      eventsConsumed: ["onboarding.completed"],
      integrationsCount: 2,
      domainSummary: "Coordenação",
    })

    expect(contract.capabilities[0]).toEqual(
      expect.objectContaining({ technicalLabel: "hub.read", label: "Ler Hub" }),
    )
    expect(contract.status).toBe("available")
    expect(contract.relationsCount).toBe(2)
  })
})

function project(overrides: Partial<Parameters<typeof presentProjectPortfolio>[0][number]> = {}) {
  return {
    projectId: "project",
    displayName: "Project",
    sourceTypeLabel: "App interno",
    sourceType: "internal_monorepo_app",
    trustLevelLabel: "Core",
    trustLevel: "core",
    healthStatus: "healthy" as const,
    readinessScore: 90,
    lastCheckAt: "2026-08-13T00:00:00.000Z",
    ...overrides,
  }
}
