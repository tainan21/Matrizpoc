import { describe, expect, it } from "vitest"
import { resolveWorkbenchRuntimeMode } from "./runtime-mode"

describe("Workbench runtime mode", () => {
  it("uses the Control desktop mode only when the server environment declares it", () => {
    expect(resolveWorkbenchRuntimeMode({ WORKBENCH_RUNTIME_MODE: "control-desktop" })).toBe(
      "control-desktop",
    )
    expect(resolveWorkbenchRuntimeMode({ WORKBENCH_RUNTIME_MODE: "browser-choice" })).toBe(
      "standalone-web",
    )
  })

  it("keeps tests deterministic regardless of a desktop declaration", () => {
    expect(
      resolveWorkbenchRuntimeMode({
        NODE_ENV: "test",
        WORKBENCH_RUNTIME_MODE: "control-desktop",
      }),
    ).toBe("test")
  })
})
