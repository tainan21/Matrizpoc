import { describe, expect, it } from "vitest"
import { buildTerminationInvocation } from "./terminate-tree"

describe("process tree termination", () => {
  it("uses taskkill for the complete Windows tree", () => {
    expect(buildTerminationInvocation(8123, "win32")).toEqual({
      command: "taskkill.exe",
      args: ["/PID", "8123", "/T", "/F"],
    })
  })

  it("targets the process group on Unix", () => {
    expect(buildTerminationInvocation(8123, "linux")).toEqual({
      signalPid: -8123,
      signal: "SIGTERM",
    })
  })
})
