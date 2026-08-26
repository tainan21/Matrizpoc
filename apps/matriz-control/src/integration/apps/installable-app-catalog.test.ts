import { describe, expect, it } from "vitest"
import { manifest as healthManifest } from "@apps/health/public-contract"
import { INSTALLABLE_APPS } from "./installable-app-catalog"

describe("installable app catalog", () => {
  it("derives Health identity from its public manifest and registered runtime", () => {
    expect(INSTALLABLE_APPS).toHaveLength(1)
    expect(INSTALLABLE_APPS[0]).toMatchObject({
      manifest: healthManifest,
      projectId: "health",
      baseUrl: "http://127.0.0.1:3010",
      accent: "health",
      mutationId: "control.smart-app-rail",
    })
  })
})
