import { describe, expect, it } from "vitest"
import { presentActivity, presentFeatureFlag, presentOnboarding } from "./operations-presenter"

describe("operations presenters", () => {
  it("merges and orders events and telemetry without losing technical names", () => {
    const result = presentActivity(
      [{ id: "event", type: "contract.created", source: "contracts", occurredAt: "2026-08-13T10:00:00.000Z", version: "v1" }],
      [{ id: "tel", type: "hub.app.opened", source: "matriz-hub", occurredAt: "2026-08-13T11:00:00.000Z", category: "ecosystem" }],
    )
    expect(result.items.map((item) => item.id)).toEqual(["tel", "event"])
    expect(result.items[0]).toEqual(expect.objectContaining({ technicalLabel: "hub.app.opened", label: "Hub · App · Opened" }))
  })

  it("keeps onboarding not-started distinct from in-progress and complete", () => {
    expect(presentOnboarding(undefined).status).toBe("planned")
    expect(presentOnboarding({ completedAt: undefined, appPayloadCount: 1 }).status).toBe("running")
    expect(presentOnboarding({ completedAt: "2026-08-13T00:00:00.000Z", appPayloadCount: 1 }).status).toBe("complete")
  })

  it("teaches a feature flag through human and technical labels", () => {
    expect(presentFeatureFlag({ flag: "new-onboarding", enabled: true })).toEqual(
      expect.objectContaining({ label: "Novo onboarding", technicalLabel: "new-onboarding", status: "available" }),
    )
  })
})
