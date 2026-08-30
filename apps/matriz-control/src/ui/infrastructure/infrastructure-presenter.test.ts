import { describe, expect, it } from "vitest"
import { presentInfrastructureInventory } from "./infrastructure-presenter"

describe("infrastructure inventory presenter", () => {
  it("presents operational declarations without environment key names", () => {
    const view = presentInfrastructureInventory({
      apps: [{
        appId: "seumei",
        classification: "product",
        runtimeKind: "web",
        port: 3008,
        healthPath: "/api/health",
        schema: "seumei",
        tenancy: "tenant",
        runtimeRole: "matriz_seumei_runtime",
        migrationRole: "matriz_seumei_migration",
        identityRequired: true,
        oidcClientId: "seumei",
        cacheRequired: false,
        cacheNamespaces: [],
        eventTransport: "nats-jetstream",
        outbox: true,
        inbox: false,
        environmentKeyCount: 3,
        secretKeyCount: 2,
        filesystemRequired: false,
      }],
      issues: [],
      summary: { apps: 1, databaseOwners: 1, identityClients: 1, cacheUsers: 0, eventParticipants: 1 },
    })

    expect(view.status).toEqual({ tone: "healthy", label: "Contratos válidos" })
    expect(view.metrics).toEqual([
      { label: "Apps", value: "1" },
      { label: "Schemas", value: "1 / 8" },
      { label: "OIDC", value: "1" },
      { label: "Eventos", value: "1" },
    ])
    expect(view.apps[0]).toMatchObject({ runtime: "web · 127.0.0.1:3008", database: "seumei · tenant", secrets: "2 protegidos de 3 chaves" })
    expect(JSON.stringify(view)).not.toContain("DATABASE_URL")
  })
})
