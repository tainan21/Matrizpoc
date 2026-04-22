import { describe, it, expect } from "vitest"
import { createEventBus } from "@matriz/integration-events"

/**
 * Smoke test — Event Bus (L8)
 *
 * Valida emit/on/history/off para os 6 eventos obrigatorios do escopo.
 */
describe("smoke: events", () => {
  it("on(name, handler) receives emitted event", async () => {
    const bus = createEventBus()
    const received: string[] = []
    bus.on("spot.gig.created", (env) => {
      received.push(env.payload.gigId)
    })
    bus.emit("spot.gig.created", {
      sourceApp: "spot",
      tenantId: "tenant-acme",
      payload: { gigId: "g1", tenantId: "tenant-acme", title: "T", bandName: "B", venueName: "V" },
    })
    // handler e chamado via microtask
    await Promise.resolve()
    expect(received).toEqual(["g1"])
  })

  it("history is recorded in order", () => {
    const bus = createEventBus()
    bus.emit("hub.app.opened", { sourceApp: "matriz-hub", tenantId: "t", payload: { appId: "spot", tenantId: "t" } })
    bus.emit("hub.app.opened", { sourceApp: "matriz-hub", tenantId: "t", payload: { appId: "seumei", tenantId: "t" } })
    const h = bus.history()
    expect(h).toHaveLength(2)
    expect(h[0]?.payload).toMatchObject({ appId: "spot" })
    expect(h[1]?.payload).toMatchObject({ appId: "seumei" })
  })

  it("off(name, handler) stops delivery", async () => {
    const bus = createEventBus()
    let count = 0
    const handler = () => {
      count += 1
    }
    bus.on("contract.created", handler)
    bus.emit("contract.created", {
      sourceApp: "contracts",
      tenantId: "t",
      payload: { contractId: "c1", tenantId: "t", originApp: "spot", title: "t" },
    })
    await Promise.resolve()
    bus.off("contract.created", handler)
    bus.emit("contract.created", {
      sourceApp: "contracts",
      tenantId: "t",
      payload: { contractId: "c2", tenantId: "t", originApp: "spot", title: "t" },
    })
    await Promise.resolve()
    expect(count).toBe(1)
  })

  it("envelope carries { version: 'v1' } and well-formed metadata", () => {
    const bus = createEventBus()
    const env = bus.emit("onboarding.completed", {
      sourceApp: "matriz-hub",
      tenantId: "tenant-acme",
      payload: { tenantId: "tenant-acme", appId: "spot", completedSteps: ["tenant-basics"] },
    })
    expect(env.version).toBe("v1")
    expect(env.name).toBe("onboarding.completed")
    expect(env.sourceApp).toBe("matriz-hub")
    expect(env.tenantId).toBe("tenant-acme")
    expect(typeof env.id).toBe("string")
    expect(typeof env.occurredAt).toBe("string")
  })

  it("contract.linked flows from contracts", () => {
    const bus = createEventBus()
    let captured: { app: string; entityType: string } | undefined
    bus.on("contract.linked", (env) => {
      captured = { app: env.payload.linksTo.app, entityType: env.payload.linksTo.entityType }
    })
    bus.emit("contract.linked", {
      sourceApp: "contracts",
      tenantId: "t",
      payload: {
        contractId: "c1",
        tenantId: "t",
        externalLinkId: "xlink-1",
        linksTo: { app: "spot", entityType: "gig", entityId: "g1" },
      },
    })
    return Promise.resolve().then(() => {
      expect(captured).toEqual({ app: "spot", entityType: "gig" })
    })
  })

  it("seumei.establishment.selected is deliverable", async () => {
    const bus = createEventBus()
    let hits = 0
    bus.on("seumei.establishment.selected", () => {
      hits += 1
    })
    bus.emit("seumei.establishment.selected", {
      sourceApp: "seumei",
      tenantId: "t",
      payload: { establishmentId: "e1", tenantId: "t", name: "Bar" },
    })
    await Promise.resolve()
    expect(hits).toBe(1)
  })
})
