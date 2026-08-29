import { describe, expect, it } from "vitest"
import { isLoopbackPortAvailable } from "./port-observer"

describe("loopback port observation", () => {
  it("reports free only for an explicit connection refusal", () => {
    expect(isLoopbackPortAvailable({ code: "ECONNREFUSED" })).toBe(true)
    expect(isLoopbackPortAvailable("connected")).toBe(false)
    expect(isLoopbackPortAvailable("timeout")).toBe(false)
    expect(isLoopbackPortAvailable({ code: "EACCES" })).toBe(false)
  })

  it("does not probe invalid TCP port numbers", async () => {
    await expect(import("./port-observer").then(({ observeLoopbackPort }) => observeLoopbackPort(99_999))).resolves.toBe(false)
  })
})
