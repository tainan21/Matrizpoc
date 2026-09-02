import { describe, expect, it } from "vitest"

import { WORKBENCH_CONTROL_SURFACE } from "../../../public-contract"

describe("Workbench Control public surface", () => {
  it("publishes one versioned trusted loopback surface without domain internals", () => {
    expect(WORKBENCH_CONTROL_SURFACE).toEqual({
      appId: "matriz-workbench",
      contractVersion: "workbench-control-v1",
      routePath: "/control",
      healthPath: "/api/control/health",
      diagnosticsPath: "/api/control/diagnostics",
      embedding: "trusted-loopback-webview",
      capabilities: ["health", "diagnostics", "repairs", "coworking"],
    })
  })
})
