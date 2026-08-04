import { describe, expect, it } from "vitest"
import { parseSharedCacheWrite } from "../../apps/matriz-hub/src/ecosystem/shared-cache-contract"

describe("shared cache contract", () => {
  it("accepts the bounded proof payload", () => {
    expect(parseSharedCacheWrite({ key: "ecosystem-proof", value: "ola", updatedBy: "spot" })).toEqual({
      key: "ecosystem-proof", value: "ola", updatedBy: "spot",
    })
  })

  it("rejects oversized or unknown payloads", () => {
    expect(parseSharedCacheWrite({ key: "x".repeat(65), value: "ola", updatedBy: "spot" })).toBeUndefined()
    expect(parseSharedCacheWrite({ key: "ecosystem-proof", value: "x".repeat(501), updatedBy: "spot" })).toBeUndefined()
    expect(parseSharedCacheWrite({ key: "ecosystem-proof", value: "ola", updatedBy: "unknown" })).toBeUndefined()
  })
})
