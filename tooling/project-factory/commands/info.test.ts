import { describe, expect, it } from "vitest"
import { localAppCatalog } from "../catalog"
import { formatAppInfo } from "./info"

describe("app info", () => {
  it("prints stable runtime information", () => {
    expect(formatAppInfo(localAppCatalog[1]!, "@matriz/app-spot")).toBe([
      "App: spot (spot)",
      "Package: @matriz/app-spot",
      "Directory: apps/spot",
      "URL: http://127.0.0.1:3001",
      "Health: http://127.0.0.1:3001/api/health",
      "Lifecycle: active",
    ].join("\n"))
  })
})
