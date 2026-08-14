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
        version: "0.1.0",
        enabled: true,
        capabilitiesCount: 8,
        routesCount: 12,
        integrationsCount: 4,
        integrations: [
          { targetAppId: "spot", kind: "event-consumer" },
          { targetAppId: "ghost", kind: "external-link" },
        ],
      },
      {
        appId: "spot",
        name: "Spot",
        version: "2.4.0",
        description: "Operação de gigs",
        enabled: true,
        capabilitiesCount: 4,
        routesCount: 5,
        integrationsCount: 2,
        integrations: [
          { targetAppId: "matriz-hub", kind: "event-producer" },
        ],
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

  it("builds graph nodes only from registered manifests and ignores unknown targets", () => {
    const vm = toHubOverviewVM(source())

    expect(vm.graph.nodes.map((node) => [node.id, node.version])).toEqual([
      ["matriz-hub", "0.1.0"],
      ["spot", "2.4.0"],
    ])
    expect(vm.graph.edges.map((edge) => [edge.sourceId, edge.targetId, edge.kind])).toEqual([
      ["matriz-hub", "spot", "event-consumer"],
      ["spot", "matriz-hub", "event-producer"],
    ])
  })

  it("keeps missing institutional health explicit instead of fabricating a reading", () => {
    const vm = toHubOverviewVM(
      source({ projects: source().projects.filter((project) => project.projectId !== "spot") }),
    )

    expect(vm.graph.nodes.find((node) => node.id === "spot")).toMatchObject({
      status: "available",
      statusLabel: "Sem leitura",
      readinessScore: undefined,
      lastCheckAt: undefined,
    })
  })

  it("selects matriz-hub initially and falls back to the first real node", () => {
    expect(toHubOverviewVM(source()).graph.defaultSelectedId).toBe("matriz-hub")

    const withoutHub = source({ apps: source().apps.filter((app) => app.appId !== "matriz-hub") })
    expect(toHubOverviewVM(withoutHub).graph.defaultSelectedId).toBe("spot")
  })

  it("keeps activity ordered newest-first and capped at eight session items", () => {
    const events = Array.from({ length: 9 }, (_, index) => ({
      id: `event-${index}`,
      type: `event.${index}`,
      source: "matriz-hub",
      occurredAt: `2026-08-13T12:${String(index).padStart(2, "0")}:00.000Z`,
    }))

    const vm = toHubOverviewVM(source({ events, telemetry: [] }))

    expect(vm.activity.items).toHaveLength(8)
    expect(vm.activity.items.map((item) => item.id)).toEqual([
      "event-8",
      "event-7",
      "event-6",
      "event-5",
      "event-4",
      "event-3",
      "event-2",
      "event-1",
    ])
  })
})
