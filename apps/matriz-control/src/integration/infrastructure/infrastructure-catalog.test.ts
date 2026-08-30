import path from "node:path"
import { describe, expect, it } from "vitest"
import { loadControlInfrastructureInventory } from "./infrastructure-catalog"

function repositoryRoot() {
  return path.basename(process.cwd()) === "matriz-control"
    ? path.resolve(process.cwd(), "../..")
    : process.cwd()
}

describe("Control infrastructure inventory", () => {
  it("discovers declarations without exposing values or absolute paths", async () => {
    const inventory = await loadControlInfrastructureInventory(repositoryRoot())

    expect(inventory.issues).toEqual([])
    expect(inventory.apps).toHaveLength(16)
    expect(inventory.summary).toEqual({
      apps: 16,
      databaseOwners: 8,
      identityClients: 8,
      cacheUsers: 1,
      eventParticipants: 9,
    })
    expect(JSON.stringify(inventory)).not.toContain("C:\\Apps")
    expect(inventory.apps.find((app) => app.appId === "matriz-ops")).toMatchObject({
      schema: "ops",
      tenancy: "operator-global",
      secretKeyCount: 3,
    })
  })
})
