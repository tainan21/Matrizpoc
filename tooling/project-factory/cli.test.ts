import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, it, vi } from "vitest"
import { runCli } from "./cli"

describe("project factory CLI", () => {
  it("prints app information", async () => {
    const write = vi.fn()

    const exitCode = await runCli(["info", "spot"], { repositoryRoot: process.cwd(), write })

    expect(exitCode).toBe(0)
    expect(write.mock.calls.join("\n")).toContain("URL: http://127.0.0.1:3001")
  })

  it("returns a clear error for an unknown app", async () => {
    const write = vi.fn()

    const exitCode = await runCli(["info", "missing"], { repositoryRoot: process.cwd(), write })

    expect(exitCode).toBe(1)
    expect(write).toHaveBeenCalledWith(expect.stringContaining('Unknown app "missing"'))
  })

  it("starts and waits for only the selected app", async () => {
    const write = vi.fn()
    const waitForExit = vi.fn(async () => 0)
    const runLocalApp = vi.fn(async () => ({ pid: 42, url: "http://127.0.0.1:3001", stop: vi.fn(), waitForExit }))

    const exitCode = await runCli(["dev", "spot"], {
      repositoryRoot: process.cwd(),
      write,
      runLocalApp,
    })

    expect(runLocalApp).toHaveBeenCalledTimes(1)
    expect(runLocalApp.mock.calls[0]?.[0].slug).toBe("spot")
    expect(waitForExit).toHaveBeenCalledTimes(1)
    expect(exitCode).toBe(0)
  })

  it("previews and applies an approved scaffold blueprint", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "matriz-cli-"))
    const blueprintPath = path.join(root, "blueprint.json")
    await writeFile(blueprintPath, JSON.stringify({
      schemaVersion: 1,
      operation: "create",
      classification: "internal_monorepo_app",
      slug: "sample",
      displayName: "Sample",
      owner: "matriz-core",
      boundedContext: "Sample capability",
      preferredPort: 3010,
    }))
    const write = vi.fn()

    expect(await runCli(["create", blueprintPath, "--preview"], { repositoryRoot: root, write })).toBe(0)
    await expect(readFile(path.join(root, "apps/sample/package.json"), "utf8")).rejects.toThrow()
    expect(await runCli(["create", blueprintPath, "--apply"], { repositoryRoot: root, write })).toBe(0)
    await expect(readFile(path.join(root, "apps/sample/package.json"), "utf8")).resolves.toContain("@matriz/app-sample")
    await rm(root, { recursive: true, force: true })
  })

  it("previews and applies a safe import only to migration staging", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "matriz-cli-import-"))
    const source = path.join(root, "external")
    await mkdir(source)
    await writeFile(path.join(source, "README.md"), "# External\n")
    await writeFile(path.join(source, ".env"), "SECRET=yes\n")
    const write = vi.fn()
    const baseArgs = ["import", source, "--slug", "external", "--snapshot", "snapshot-001"]

    expect(await runCli([...baseArgs, "--preview"], { repositoryRoot: root, write })).toBe(0)
    await expect(readFile(path.join(root, "migration-staging/external/snapshot-001/README.md"), "utf8")).rejects.toThrow()
    expect(await runCli([...baseArgs, "--apply"], { repositoryRoot: root, write })).toBe(0)
    await expect(readFile(path.join(root, "migration-staging/external/snapshot-001/README.md"), "utf8")).resolves.toContain("External")
    await expect(readFile(path.join(root, "migration-staging/external/snapshot-001/.env"), "utf8")).rejects.toThrow()
    await rm(root, { recursive: true, force: true })
  })
})
