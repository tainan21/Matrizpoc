import { execFile as execFileCallback } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { afterEach, describe, expect, it } from "vitest"
import { GitObservationProvider } from "./git-observation-provider"

const execFile = promisify(execFileCallback)
const roots: string[] = []

async function git(root: string, ...args: string[]): Promise<string> {
  return (await execFile("git", args, { cwd: root })).stdout.trim()
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe("GitObservationProvider", () => {
  it("observes changed paths and canonical request trailers without reading file contents", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "workbench-git-observation-"))
    roots.push(root)
    await git(root, "init")
    await git(root, "config", "user.name", "Workbench Test")
    await git(root, "config", "user.email", "workbench@example.invalid")
    await writeFile(path.join(root, "tracked.txt"), "base\n")
    await git(root, "add", "tracked.txt")
    await git(root, "commit", "-m", "base")
    const baseCommit = await git(root, "rev-parse", "HEAD")

    await writeFile(path.join(root, "tracked.txt"), "changed\n")
    await git(root, "add", "tracked.txt")
    await git(root, "commit", "-m", "change", "-m", "Matriz-Request: req_11111111-1111-4111-8111-111111111111")
    await writeFile(path.join(root, "untracked.txt"), "local\n")

    const observation = await new GitObservationProvider(root).observe(baseCommit)

    expect(observation.changedFiles).toEqual(["tracked.txt", "untracked.txt"])
    expect(observation.commits).toHaveLength(1)
    expect(observation.commits[0]?.requestIds).toEqual([
      "req_11111111-1111-4111-8111-111111111111",
    ])
    expect(observation.headCommit).toMatch(/^[0-9a-f]{40}$/)

    const current = await new GitObservationProvider(root).observeCurrent()
    expect(current).toEqual({
      headCommit: observation.headCommit,
      dirtyPaths: ["untracked.txt"],
    })
  })

  it("rejects an arbitrary base revision before invoking Git", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "workbench-git-observation-"))
    roots.push(root)
    await expect(new GitObservationProvider(root).observe("HEAD; remove everything"))
      .rejects.toMatchObject({ code: "INVALID_DATA" })
  })
})
