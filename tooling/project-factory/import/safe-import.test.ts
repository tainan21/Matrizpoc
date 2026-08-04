import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { inspectImportSource, planSafeImport, applySafeImport } from "./safe-import"

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))))

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-import-"))
  roots.push(root)
  const source = path.join(root, "source")
  await mkdir(path.join(source, "src"), { recursive: true })
  await mkdir(path.join(source, ".git"), { recursive: true })
  await mkdir(path.join(source, "node_modules"), { recursive: true })
  await writeFile(path.join(source, "src/index.ts"), "export const value = 1\n")
  await writeFile(path.join(source, ".env"), "SECRET=yes\n")
  await writeFile(path.join(source, ".env.example"), "SECRET=\n")
  await writeFile(path.join(source, ".git/config"), "private")
  await writeFile(path.join(source, "node_modules/cache.js"), "cache")
  return { root, source }
}

describe("safe project import", () => {
  it("excludes secrets, git metadata and build dependencies", async () => {
    const { source } = await fixture()
    const inventory = await inspectImportSource(source)

    expect(inventory.included.map((file) => file.path)).toEqual([".env.example", "src/index.ts"])
    expect(inventory.excluded.map((file) => file.path)).toEqual(expect.arrayContaining([".env", ".git", "node_modules"]))
  })

  it("copies only approved files into migration staging and is idempotent", async () => {
    const { root, source } = await fixture()
    const inventory = await inspectImportSource(source)
    const plan = await planSafeImport(root, "sample", "snapshot-001", inventory)
    const first = await applySafeImport(root, plan)
    const secondPlan = await planSafeImport(root, "sample", "snapshot-001", inventory)
    const second = await applySafeImport(root, secondPlan)

    expect(first.created).toHaveLength(2)
    expect(second.created).toEqual([])
    await expect(readFile(path.join(root, "migration-staging/sample/snapshot-001/src/index.ts"), "utf8")).resolves.toContain("value")
    await expect(readFile(path.join(root, "migration-staging/sample/snapshot-001/.env"), "utf8")).rejects.toThrow()
  })

  it("rejects symbolic links", async () => {
    const { root, source } = await fixture()
    await writeFile(path.join(root, "outside.txt"), "outside")
    await symlink(path.join(root, "outside.txt"), path.join(source, "escape.txt"))

    await expect(inspectImportSource(source)).rejects.toThrow("symbolic link")
  })
})
