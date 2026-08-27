import { describe, expect, it } from "vitest"
import { controlHostHealthSchema } from "@matriz/integration-api-contracts"

describe("Control host health contract", () => {
  it("accepts a versioned, non-negative tab-count snapshot", () => {
    expect(controlHostHealthSchema.parse({
      version: "v1",
      sampledAt: "2026-08-25T12:00:00.000Z",
      openTabs: 3,
      suspendedTabs: 1,
    })).toMatchObject({ openTabs: 3 })
  })

  it("rejects invalid sampling data and negative counts", () => {
    expect(() => controlHostHealthSchema.parse({
      version: "v1",
      sampledAt: "x",
      openTabs: -1,
      suspendedTabs: 0,
    })).toThrow()
  })
})
