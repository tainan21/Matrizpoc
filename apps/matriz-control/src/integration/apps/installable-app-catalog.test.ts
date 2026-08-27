import { describe, expect, it } from "vitest"
import { manifest as healthManifest } from "@apps/health/public-contract"
import { INSTALLABLE_APPS } from "./installable-app-catalog"

describe("installable app catalog", () => {
  it("keeps activation and Windows installer identities in the approved public catalog", () => {
    expect(INSTALLABLE_APPS.map((app) => app.manifest.appId)).toEqual(["health", "matriz-workbench", "seumei"])
    expect(INSTALLABLE_APPS[0]).toMatchObject({
      manifest: healthManifest,
      projectId: "health",
      baseUrl: "http://127.0.0.1:3010",
      kind: "activation",
      accent: "health",
      mutationId: "control.smart-app-rail",
    })
    expect(INSTALLABLE_APPS.slice(1)).toMatchObject([
      { manifest: { appId: "matriz-workbench" }, kind: "windows_installer", releaseId: "matriz-workbench-windows-x64-stable", windows: { appUserModelId: "com.matriz.workbench", publisher: "Matriz" } },
      { manifest: { appId: "seumei" }, kind: "windows_installer", releaseId: "seumei-windows-x64-stable", windows: { appUserModelId: "com.matriz.seumei", publisher: "Matriz" } },
    ])
  })
})
