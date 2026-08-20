import { describe, expect, it } from "vitest"
import { manifest } from "./manifest"

describe("Seumei manifest", () => {
  it("publishes only the implemented company onboarding surface", () => {
    expect(manifest).toMatchObject({ appId: "seumei", name: "Seumei", primaryRoute: "/" })
    expect(manifest.routes.map(({ path }) => path)).toEqual(["/", "/onboarding", "/workspace", "/login"])
    expect(manifest.capabilities.map(({ id }) => id)).toEqual([
      "seumei.company.read",
      "seumei.company.create",
      "seumei.company.select",
      "seumei.onboarding.update",
      "seumei.workspace.read",
    ])
    expect(manifest.routes.map(({ path }) => path).join(" ")).not.toMatch(/product|stock|orders/i)
    expect(manifest.capabilities.map(({ id }) => id).join(" ")).not.toMatch(/product|stock|orders/i)
  })
})
