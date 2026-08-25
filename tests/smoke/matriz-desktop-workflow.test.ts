import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const workspaceRoot = process.cwd()
const smokeWorkflow = readFileSync(path.join(workspaceRoot, ".github/workflows/matriz-desktop.yml"), "utf8")

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
})
