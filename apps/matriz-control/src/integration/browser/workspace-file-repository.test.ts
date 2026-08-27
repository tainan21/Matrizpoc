import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { WorkspaceFileRepository } from "./workspace-file-repository"

const temporary: string[] = []
afterEach(async () => { await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true }))) })

describe("WorkspaceFileRepository", () => {
  it("reads and atomically updates allowlisted text files with optimistic conflict detection", async () => {
    const root = await mkdtemp(join(tmpdir(), "matriz-control-files-")); temporary.push(root)
    await writeFile(join(root, "page.tsx"), "export const value = 1\n", "utf8")
    const repository = new WorkspaceFileRepository({ resolveProject: async (id) => id === "demo" ? root : undefined })

    const opened = await repository.read("demo", "page.tsx")
    const saved = await repository.write("demo", "page.tsx", "export const value = 2\n", opened.version)

    expect(await readFile(join(root, "page.tsx"), "utf8")).toBe("export const value = 2\n")
    expect(saved.version).not.toBe(opened.version)
    await expect(repository.write("demo", "page.tsx", "stale", opened.version)).rejects.toThrow(/changed on disk/i)
  })

  it("rejects path escape, unsupported extensions and files larger than two MiB", async () => {
    const root = await mkdtemp(join(tmpdir(), "matriz-control-files-")); temporary.push(root)
    await writeFile(join(root, "asset.png"), "not really an image", "utf8")
    await writeFile(join(root, "large.txt"), "x".repeat(2 * 1024 * 1024 + 1), "utf8")
    const repository = new WorkspaceFileRepository({ resolveProject: async () => root })

    await expect(repository.read("demo", "../secret.txt")).rejects.toThrow(/invalid relative path/i)
    await expect(repository.read("demo", "asset.png")).rejects.toThrow(/unsupported text file/i)
    await expect(repository.read("demo", "large.txt")).rejects.toThrow(/larger than 2 mib/i)
  })
})
