import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createMaturityGoalCatalog } from "./maturity-goal-catalog"
import { auditWorkbenchMaturity } from "./maturity-evidence-audit"

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("maturity evidence audit", () => {
  it("awards points only when every declared evidence file exists", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "matriz-score-"))
    roots.push(root)
    await mkdir(path.join(root, "apps", "matriz-workbench"), { recursive: true })
    await writeFile(path.join(root, "apps", "matriz-workbench", "README.md"), "# Workbench\n")

    const result = await auditWorkbenchMaturity(root, createMaturityGoalCatalog())

    expect(result.verifiedOrdinals).toContain(1)
    expect(result.verifiedOrdinals).not.toContain(2)
    expect(result.goals[0]?.evidence).toEqual(["apps/matriz-workbench/README.md"])
    expect(result.goals[1]?.score).toBe(0)
  })
})
