import { describe, expect, it } from "vitest"
import { withReadDeadline } from "./read-deadline"

describe("withReadDeadline", () => {
  it("keeps availability views responsive when an optional local read is slow", async () => {
    await expect(withReadDeadline(new Promise<never>(() => undefined), 5)).rejects.toThrow("Local read timed out")
  })

  it("returns a completed local read unchanged", async () => {
    await expect(withReadDeadline(Promise.resolve("ready"), 50)).resolves.toBe("ready")
  })
})
