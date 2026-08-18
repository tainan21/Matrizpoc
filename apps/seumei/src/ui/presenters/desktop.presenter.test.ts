import { createInMemoryStore } from "@matriz/platform-storage"
import { describe, expect, it } from "vitest"

import { createSeumeiContainer } from "../../lib/container"
import { toDesktopSnapshot } from "./desktop.presenter"

describe("Seumei desktop presenter", () => {
  it("projects the local domain into one compact desktop snapshot", async () => {
    const container = createSeumeiContainer(createInMemoryStore())
    const snapshot = await toDesktopSnapshot(container.useCases, "tenant-matriz" as never)

    expect(snapshot.metrics).toEqual({ establishments: 2, active: 2, offerings: 2 })
    expect(snapshot.establishments[0]).toMatchObject({ name: "Bar da Matriz", ownerName: "Joana Silva" })
    expect(snapshot.owners.map(({ ownerName }) => ownerName)).toEqual(["Joana Silva", "Ricardo Almeida"])
  })
})
