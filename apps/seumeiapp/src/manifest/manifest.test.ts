import { describe, expect, it } from "vitest"
import { manifest } from "./manifest"

describe("Seumei manifest", () => {
  it("publishes only implemented company, membership and catalog surfaces", () => {
    expect(manifest).toMatchObject({ appId: "seumei", name: "Seumei", primaryRoute: "/" })
    expect(manifest.routes.map(({ path }) => path)).toEqual([
      "/",
      "/onboarding",
      "/workspace",
      "/workspace/members",
      "/workspace/products",
      "/docs",
      "/invite/[token]",
      "/login",
    ])
    expect(manifest.capabilities.map(({ id }) => id)).toEqual([
      "seumei.company.read",
      "seumei.company.create",
      "seumei.company.select",
      "seumei.onboarding.update",
      "seumei.workspace.read",
      "seumei.members.read",
      "seumei.members.invite",
      "seumei.members.manage",
      "seumei.invitation.accept",
      "seumei.catalog.read",
      "seumei.catalog.manage",
    ])
    expect(manifest.routes.map(({ path }) => path).join(" ")).not.toMatch(/stock|orders/i)
    expect(manifest.capabilities.map(({ id }) => id).join(" ")).not.toMatch(/stock|orders/i)
  })
})
