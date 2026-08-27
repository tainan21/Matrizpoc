import { describe, expect, it } from "vitest"
import { resolveWorkbenchRuntimeMode } from "./runtime-mode"

describe("Workbench runtime mode", () => {
  it("uses native desktop mode and maps the legacy Control value to it", () => {
    expect(resolveWorkbenchRuntimeMode({ WORKBENCH_RUNTIME_MODE: "native-desktop" })).toBe(
      "native-desktop",
    )
    expect(resolveWorkbenchRuntimeMode({ WORKBENCH_RUNTIME_MODE: "control-desktop" })).toBe(
      "native-desktop",
    )
    expect(resolveWorkbenchRuntimeMode({ WORKBENCH_RUNTIME_MODE: "browser-choice" })).toBe(
      "standalone-web",
    )
  })

  it("keeps tests deterministic regardless of a desktop declaration", () => {
    expect(
      resolveWorkbenchRuntimeMode({
        NODE_ENV: "test",
        WORKBENCH_RUNTIME_MODE: "native-desktop",
      }),
    ).toBe("test")
  })
})
