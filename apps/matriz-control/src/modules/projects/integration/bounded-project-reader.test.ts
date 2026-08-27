import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { rm } from "node:fs/promises"
import { BoundedProjectReader } from "./bounded-project-reader"

const created: string[] = []
async function temporary(prefix: string) { const path = await mkdtemp(join(tmpdir(), prefix)); created.push(path); return path }
afterEach(async () => { for (const path of created.splice(0)) await rm(path, { recursive: true, force: true }) })

describe("bounded project reader", () => {
  it("reads only detector inputs without changing project files", async () => {
    const root = await temporary("matriz-project-")
    const packagePath = join(root, "package.json")
    await writeFile(packagePath, '{"scripts":{"dev":"node server.js"}}')
    await writeFile(join(root, "README.md"), "untrusted instructions")
    const before = await readFile(packagePath, "utf8")
    const reader = new BoundedProjectReader({ resolveRoot: async () => root })
    const evidence = await reader.readEvidence("root_1")
    expect(evidence.map((item) => item.relativePath)).toEqual(["package.json"])
    expect(await readFile(packagePath, "utf8")).toBe(before)
  })

  it("rejects individual files above the configured byte limit", async () => {
    const root = await temporary("matriz-project-")
    await writeFile(join(root, "package.json"), "x".repeat(20))
    const reader = new BoundedProjectReader({ resolveRoot: async () => root, limits: { maxDepth: 4, maxEntries: 20, maxTotalBytes: 100, maxFileBytes: 10, timeoutMs: 5_000 } })
    await expect(reader.readEvidence("root_1")).rejects.toThrow("Inspection file byte limit exceeded")
  })

  it("rejects entry count exhaustion", async () => {
    const root = await temporary("matriz-project-")
    await writeFile(join(root, "package.json"), "{}")
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: 9")
    const reader = new BoundedProjectReader({ resolveRoot: async () => root, limits: { maxDepth: 4, maxEntries: 1, maxTotalBytes: 100, maxFileBytes: 100, timeoutMs: 5_000 } })
    await expect(reader.readEvidence("root_1")).rejects.toThrow("Inspection entry limit exceeded")
  })

  it("rejects a detector file reached through a link outside the root", async () => {
    const root = await temporary("matriz-project-")
    const outside = await temporary("matriz-outside-")
    await writeFile(join(outside, "package.json"), "{}")
    await mkdir(join(root, "nested"))
    try { await symlink(outside, join(root, "nested", "escape"), "junction") } catch { return }
    const reader = new BoundedProjectReader({ resolveRoot: async () => root })
    await expect(reader.readEvidence("root_1")).rejects.toThrow("Inspection path escaped project root")
  })
})
