import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { planApplicationScaffold } from "./plan"
import { applyScaffoldPlan } from "./apply"

const roots: string[] = []
async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-factory-"))
  roots.push(root)
  return root
}
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

const blueprint = {
  schemaVersion: 1 as const,
  operation: "create" as const,
  classification: "internal_monorepo_app" as const,
  slug: "sample",
  displayName: "Sample",
  owner: "matriz-core",
  boundedContext: "Sample capability",
  preferredPort: 3010,
}

describe("application scaffold", () => {
  it("previews the minimal app without writing", async () => {
    const root = await tempRoot()
    const plan = await planApplicationScaffold(root, blueprint)

    expect(plan.operations.map((operation) => operation.path)).toContain("apps/sample/src/manifest/manifest.ts")
    await expect(readFile(path.join(root, "apps/sample/package.json"), "utf8")).rejects.toThrow()
  })

  it("applies once and skips identical files on the second application", async () => {
    const root = await tempRoot()
    const firstPlan = await planApplicationScaffold(root, blueprint)
    const first = await applyScaffoldPlan(root, firstPlan)
    const secondPlan = await planApplicationScaffold(root, blueprint)
    const second = await applyScaffoldPlan(root, secondPlan)

    expect(first.created.length).toBeGreaterThan(5)
    expect(second.created).toEqual([])
    expect(second.skipped).toHaveLength(first.created.length)
  })

  it("blocks all writes when any target conflicts", async () => {
    const root = await tempRoot()
    await mkdir(path.join(root, "apps/sample"), { recursive: true })
    await writeFile(path.join(root, "apps/sample/package.json"), "user content", "utf8")
    const plan = await planApplicationScaffold(root, blueprint)

    await expect(applyScaffoldPlan(root, plan)).rejects.toThrow("conflicting files")
    await expect(readFile(path.join(root, "apps/sample/README.md"), "utf8")).rejects.toThrow()
    await expect(readFile(path.join(root, "apps/sample/package.json"), "utf8")).resolves.toBe("user content")
  })
})
