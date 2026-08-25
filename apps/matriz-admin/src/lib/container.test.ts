import { createInMemoryStore, createNamespacedStore } from "@matriz/platform-storage"
import { describe, expect, it } from "vitest"

import { createSeumeiContainer } from "./container"

describe("createSeumeiContainer", () => {
  it("persists its local seed inside the supplied namespace", async () => {
    const base = createInMemoryStore()
    const nativeStore = createNamespacedStore(base, "seumei-desktop:v1")
    const webStore = createNamespacedStore(base, "seumei-web:v1")

    const first = createSeumeiContainer(nativeStore)
    expect(await first.useCases.listEstablishments("tenant-matriz" as never)).toHaveLength(2)
    expect(nativeStore.keys()).toContain("seumei:establishments:v1")
    expect(webStore.keys()).toEqual([])

    const restored = createSeumeiContainer(nativeStore)
    expect(await restored.useCases.listEstablishments("tenant-matriz" as never)).toHaveLength(2)
  })
})
