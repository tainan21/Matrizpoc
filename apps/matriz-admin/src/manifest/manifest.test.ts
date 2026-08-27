import { describe, expect, it } from "vitest"

import { manifest } from "./manifest"

describe("Matriz Admin manifest migration", () => {
  it("uses the final administrative identity without claiming Seumei events", () => {
    expect(manifest).toMatchObject({
      appId: "matriz-admin",
      name: "Matriz Admin",
      primaryRoute: "/",
    })
    expect(manifest.eventsProduced).not.toContain("seumei.establishment.selected")
  })
})
