import { describe, expect, it } from "vitest"
import { toHubOverviewVM, type HubOverviewSource } from "./overview-presenter"

function source(
  overrides: Partial<HubOverviewSource> = {},
): HubOverviewSource {
  return {
    generatedAt: "2026-08-13T12:00:00.000Z",
    apps: [
      {
        appId: "matriz-hub",
        name: "Matriz Hub",
        description: "Centro do ecossistema",
        enabled: true,
        capabilitiesCount: 8,
        routesCount: 12,
        integrationsCount: 4,
      },
      {
        appId: "spot",
        name: "Spot",
        description: "Operação de gigs",
        enabled: true,
        capabilitiesCount: 4,
        routesCount: 5,
        integrationsCount: 2,
      },
    ],
    projects: [
      {
        projectId: "matriz-hub",
        displayName: "Matriz Hub",
        healthStatus: "healthy",
        readinessScore: 92,
        lastCheckAt: "2026-08-13T11:50:00.000Z",
        accentColor: "#22d3ee",
      },
      {
        projectId: "spot",
        displayName: "Spot",
        healthStatus: "degraded",
        readinessScore: 61,
        lastCheckAt: "2026-08-13T11:48:00.000Z",
        accentColor: "#f59e0b",
      },
    ],
    events: [],
    telemetry: [],
    institutionalUpdatedAt: "2026-08-13T11:50:00.000Z",
    ...overrides,
  }
}

describe("Hub operational overview presenter", () => {
  it("turns degraded and offline projects into truthful attention items", () => {
    const vm = toHubOverviewVM(
      source({
        projects: [
          {
            projectId: "spot",
            displayName: "Spot",
            healthStatus: "degraded",
            readinessScore: 61,
            lastCheckAt: "2026-08-13T11:48:00.000Z",
          },
          {
            projectId: "contracts",
            displayName: "Contracts",
            healthStatus: "offline",
            readinessScore: 24,
            lastCheckAt: "2026-08-13T11:40:00.000Z",
          },
        ],
      }),
    )

    expect(vm.attention.map((item) => [item.label, item.status])).toEqual([
      ["Contracts", "blocked"],
      ["Spot", "attention"],
    ])
  })

  it("describes an empty activity stream as session-scoped", () => {
    const vm = toHubOverviewVM(source({ events: [], telemetry: [] }))

    expect(vm.activity.items).toEqual([])
    expect(vm.activity.emptyDescription).toContain("sessão")
  })

  it("chooses the lowest-readiness project as the next review action", () => {
    const vm = toHubOverviewVM(source())

    expect(vm.nextAction).toMatchObject({
      label: "Revisar Spot",
      href: "/projects/spot",
      status: "attention",
    })
  })

  it("keeps registry, institutional, event, and telemetry origins distinct", () => {
    const vm = toHubOverviewVM(source())

    expect(vm.origins.map((origin) => [origin.id, origin.persistence])).toEqual([
      ["registry", "process"],
      ["institutional", "snapshot"],
      ["events", "session"],
      ["telemetry", "session"],
    ])
  })
})
