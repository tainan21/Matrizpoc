import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const workspaceRoot = process.cwd()
const smokeWorkflow = readFileSync(path.join(workspaceRoot, ".github/workflows/matriz-desktop.yml"), "utf8")
const controlPackage = JSON.parse(readFileSync(path.join(workspaceRoot, "apps/matriz-control/package.json"), "utf8"))
const workbenchNextConfig = readFileSync(path.join(workspaceRoot, "apps/matriz-workbench/next.config.mjs"), "utf8")
const controlNextConfig = readFileSync(path.join(workspaceRoot, "apps/matriz-control/next.config.mjs"), "utf8")

describe("Matriz Desktop Windows workflows", () => {
  it("packages Control and Matriz Admin without stale Seumei desktop paths", () => {
    expect(smokeWorkflow).not.toContain("apps/seumei/desktop")
    expect(smokeWorkflow).toContain("apps/matriz-admin/desktop")
    expect(smokeWorkflow).toContain("@matriz/app-matriz-admin")
    expect(smokeWorkflow).toContain("matriz-control-windows-x64")
    expect(smokeWorkflow).toContain("matriz-admin-windows-x64")
  })

  it("keeps expensive installed acceptance scheduled and manually dispatchable", () => {
    const acceptanceWorkflow = readFileSync(
      path.join(workspaceRoot, ".github/workflows/matriz-desktop-acceptance.yml"),
      "utf8",
    )

    expect(acceptanceWorkflow).toMatch(/^\s{2}schedule:/m)
    expect(acceptanceWorkflow).toMatch(/^\s{2}workflow_dispatch:/m)
    expect(acceptanceWorkflow).toContain("windows-latest")
    expect(acceptanceWorkflow).toContain("acceptance:installed")
    expect(acceptanceWorkflow).toContain("if: always()")
  })

  it("publishes an Authenticode and Tauri-signed Control updater", () => {
    const releaseWorkflow = readFileSync(
      path.join(workspaceRoot, ".github/workflows/matriz-control-tauri-windows-release.yml"),
      "utf8",
    )
    const packagingScript = readFileSync(
      path.join(workspaceRoot, "apps/matriz-desktop/scripts/package-signed-update.ps1"),
      "utf8",
    )

    expect(releaseWorkflow).toContain("TAURI_SIGNING_PRIVATE_KEY")
    expect(releaseWorkflow).toContain("MATRIZ_CONTROL_UPDATER_PUBLIC_KEY")
    expect(releaseWorkflow).toContain("MATRIZ_DISTRIBUTION_CATALOG_URL")
    expect(releaseWorkflow).toContain("MATRIZ_DISTRIBUTION_PUBLIC_KEY")
    expect(releaseWorkflow).toContain("package:update")
    expect(releaseWorkflow).toContain("$name.sig")
    expect(releaseWorkflow).toContain("steps.artifact.outputs.signature")
    expect(packagingScript).toContain("certificateThumbprint")
    expect(packagingScript).toContain("TAURI_SIGNING_PRIVATE_KEY is required")
  })

  it("keeps Workbench standalone and ships independent Windows release workflows", () => {
    const workbenchRelease = readFileSync(path.join(workspaceRoot, ".github/workflows/workbench-windows-release.yml"), "utf8")
    const seumeiRelease = readFileSync(path.join(workspaceRoot, ".github/workflows/seumei-windows-release.yml"), "utf8")
    expect(workbenchNextConfig).toContain('output: "standalone"')
    expect(workbenchNextConfig).toContain("outputFileTracingRoot: workspaceRoot")
    expect(controlNextConfig).toContain("outputFileTracingRoot: workspaceRoot")
    expect(controlPackage.scripts.build).toBe("next build --webpack")
    expect(controlPackage.scripts["desktop:build"]).not.toContain("@matriz/app-matriz-workbench build")
    expect(controlPackage.build.extraResources.some((resource: { to?: string }) => resource.to === "workbench-runtime")).toBe(false)
    expect(workbenchRelease).toContain("workbench-v*")
    expect(workbenchRelease).toContain("desktop:release")
    expect(seumeiRelease).toContain("seumei-v*")
    expect(seumeiRelease).toContain("desktop:release")
  })
})
