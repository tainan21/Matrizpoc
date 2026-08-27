import { describe, expect, it } from "vitest"
import { workbenchStoreStatus } from "./apps-console"

describe("workbenchStoreStatus", () => {
  it("does not present Workbench as installed until the native Store confirms it", () => {
    expect(workbenchStoreStatus({ installed: false, nativeState: "available" })).toBe("DISPONÍVEL · WINDOWS")
    expect(workbenchStoreStatus({ installed: true, nativeState: "installed" })).toBe("INSTALADO · WINDOWS")
  })
})
