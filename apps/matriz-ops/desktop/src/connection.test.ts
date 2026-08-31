import { describe, expect, it } from "vitest"
import { connectToOps } from "./connection"

describe("desktop connection", () => {
  it("reports navigation after the native preflight succeeds", async () => {
    await expect(connectToOps(async () => undefined)).resolves.toBe("navigating")
  })

  it("maps every native failure to the same safe unavailable state", async () => {
    const secretBearingError = new Error("request failed with token=private")
    await expect(connectToOps(async () => { throw secretBearingError })).resolves.toBe("unavailable")
  })
})
