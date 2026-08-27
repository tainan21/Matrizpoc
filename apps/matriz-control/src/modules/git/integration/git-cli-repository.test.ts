import { execFileSync } from "node:child_process"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { GitCliRepository } from "./git-cli-repository"

function git(root: string, ...args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }).trim()
}

async function repository() {
  const root = await mkdtemp(join(tmpdir(), "matriz-control-git-"))
  git(root, "init", "-b", "main")
  git(root, "config", "user.name", "Matriz Test")
  git(root, "config", "user.email", "test@matriz.local")
  await writeFile(join(root, "tracked.txt"), "base\n")
  git(root, "add", "tracked.txt")
  git(root, "commit", "-m", "chore: baseline")
  return root
}

describe("GitCliRepository", () => {
  it("reports branch and staged, unstaged, and untracked changes", async () => {
    const root = await repository()
    await writeFile(join(root, "tracked.txt"), "staged\n")
    git(root, "add", "tracked.txt")
    await writeFile(join(root, "tracked.txt"), "unstaged\n")
    await writeFile(join(root, "new.txt"), "new\n")

    const snapshot = await new GitCliRepository(root).overview()

    expect(snapshot.branch).toBe("main")
    expect(snapshot.head.shortId).toHaveLength(7)
    expect(snapshot.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "tracked.txt", staged: "modified", unstaged: "modified" }),
      expect.objectContaining({ path: "new.txt", staged: null, unstaged: "untracked" }),
    ]))
    expect(snapshot.counts).toMatchObject({ staged: 1, unstaged: 1, untracked: 1, conflicted: 0 })
  })

  it("creates, switches, stages, and commits through typed methods", async () => {
    const root = await repository()
    const client = new GitCliRepository(root)
    await client.createBranch("feat/control-git", true)
    await writeFile(join(root, "new.txt"), "new\n")
    await client.stage(["new.txt"])
    await client.commit("feat: add control git")

    const snapshot = await client.overview()
    expect(snapshot.branch).toBe("feat/control-git")
    expect(snapshot.counts.staged).toBe(0)
    expect(snapshot.head.subject).toBe("feat: add control git")
  })

  it("rejects a path outside the repository", async () => {
    const root = await repository()
    await expect(new GitCliRepository(root).stage(["../outside.txt"])).rejects.toThrow("Invalid Git path")
  })

  it("lists branches, unstages files, and switches a known branch", async () => {
    const root = await repository()
    const client = new GitCliRepository(root)
    await client.createBranch("feat/observability")
    await writeFile(join(root, "tracked.txt"), "changed\n")
    await client.stage(["tracked.txt"])
    await client.unstage(["tracked.txt"])
    await client.switchBranch("feat/observability")

    expect((await client.branches()).map((branch) => branch.name)).toContain("feat/observability")
    expect((await client.overview()).branch).toBe("feat/observability")
    expect((await client.overview()).counts.staged).toBe(0)
  })
}, 20_000)
