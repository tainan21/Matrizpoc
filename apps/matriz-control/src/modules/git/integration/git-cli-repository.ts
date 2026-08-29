import { execFile as execFileCallback } from "node:child_process"
import { realpath } from "node:fs/promises"
import { isAbsolute, relative } from "node:path"
import { promisify } from "node:util"

const execFile = promisify(execFileCallback)

type ChangeKind = "added" | "modified" | "deleted" | "renamed" | "copied" | "untracked" | "conflicted"
export interface GitChange { readonly path: string; readonly staged: ChangeKind | null; readonly unstaged: ChangeKind | null }
export interface GitOverview {
  readonly repositoryId: string
  readonly revision: string
  readonly sampledAt: string
  readonly branch: string | null
  readonly upstream: string | null
  readonly ahead: number
  readonly behind: number
  readonly head: { readonly id: string; readonly shortId: string; readonly subject: string }
  readonly changes: readonly GitChange[]
  readonly counts: { readonly staged: number; readonly unstaged: number; readonly untracked: number; readonly conflicted: number }
}

export interface GitBranch {
  readonly name: string
  readonly current: boolean
  readonly upstream: string | null
  readonly ahead: number
  readonly behind: number
  readonly head: string
  readonly subject: string
}

export interface GitCommit {
  readonly id: string
  readonly shortId: string
  readonly subject: string
  readonly author: string
  readonly occurredAt: string
}

export class GitCliRepository {
  private root: string | null = null
  constructor(private readonly requestedRoot: string) {}

  async overview(): Promise<GitOverview> {
    const [status, head] = await Promise.all([
      this.git(["status", "--porcelain=v1", "-z", "--branch", "--untracked-files=normal"]),
      this.git(["log", "-1", "--format=%H%x00%h%x00%s"]),
    ])
    const tokens = status.split("\0").filter(Boolean)
    const header = tokens.shift() ?? "## HEAD (no branch)"
    const branch = parseBranchHeader(header)
    const changes = parseChanges(tokens)
    const [id = "", shortId = "", subject = ""] = head.split("\0")
    const root = await this.canonicalRoot()
    return {
      repositoryId: root.replaceAll("\\", "/").toLowerCase(),
      revision: `${id}:${status}`,
      sampledAt: new Date().toISOString(),
      branch: branch.branch,
      upstream: branch.upstream,
      ahead: branch.ahead,
      behind: branch.behind,
      head: { id, shortId, subject: subject.trim() },
      changes,
      counts: {
        staged: changes.filter((change) => change.staged !== null).length,
        unstaged: changes.filter((change) => change.unstaged !== null && change.unstaged !== "untracked").length,
        untracked: changes.filter((change) => change.unstaged === "untracked").length,
        conflicted: changes.filter((change) => change.staged === "conflicted" || change.unstaged === "conflicted").length,
      },
    }
  }

  async createBranch(name: string, checkout = false) {
    await this.git(["check-ref-format", "--branch", name])
    await this.git(checkout ? ["switch", "-c", name] : ["branch", name])
  }

  async switchBranch(name: string) {
    await this.git(["check-ref-format", "--branch", name])
    await this.git(["switch", name])
  }

  async branches(): Promise<readonly GitBranch[]> {
    const output = await this.git(["for-each-ref", "--format=%(HEAD)%00%(refname:short)%00%(upstream:short)%00%(ahead-behind:HEAD)%00%(objectname:short)%00%(subject)", "refs/heads"])
    return output.split(/\r?\n/).filter(Boolean).map((line) => {
      const [head = "", name = "", upstream = "", aheadBehind = "0 0", shortId = "", subject = ""] = line.split("\0")
      const [ahead = "0", behind = "0"] = aheadBehind.split(" ")
      return { name, current: head === "*", upstream: upstream || null, ahead: Number(ahead), behind: Number(behind), head: shortId, subject }
    })
  }

  async history(limit = 50): Promise<readonly GitCommit[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error("Invalid history limit")
    const output = await this.git(["log", `--max-count=${limit}`, "--format=%H%x00%h%x00%s%x00%an%x00%cI%x00"])
    const fields = output.split("\0").filter(Boolean)
    const commits: GitCommit[] = []
    for (let index = 0; index + 4 < fields.length; index += 5) {
      const [id, shortId, subject, author, occurredAt] = fields.slice(index, index + 5)
      if (id && shortId && subject && author && occurredAt) commits.push({ id, shortId, subject, author, occurredAt })
    }
    return commits
  }

  async renameBranch(name: string) {
    await this.git(["check-ref-format", "--branch", name])
    await this.git(["branch", "-m", name])
  }

  async deleteBranch(name: string, force = false) {
    await this.git(["check-ref-format", "--branch", name])
    await this.git(["branch", force ? "-D" : "-d", name])
  }

  async fetch() { await this.git(["fetch", "--prune"]) }
  async pull() { await this.git(["pull", "--ff-only"]) }
  async push() { await this.git(["push"]) }
  async merge(name: string) { await this.git(["check-ref-format", "--branch", name]); await this.git(["merge", "--no-edit", name]) }
  async abortMerge() { await this.git(["merge", "--abort"]) }
  async reflog(limit = 30) { return this.git(["reflog", `--max-count=${Math.max(1, Math.min(100, limit))}`, "--format=%h%x00%gs%x00%cI"]) }

  async stage(paths: readonly string[]) {
    if (!paths.length) throw new Error("Select at least one Git path")
    paths.forEach(assertSafePath)
    await this.git(["add", "--", ...paths])
  }

  async unstage(paths: readonly string[]) {
    if (!paths.length) throw new Error("Select at least one Git path")
    paths.forEach(assertSafePath)
    await this.git(["restore", "--staged", "--", ...paths])
  }

  async commit(message: string) {
    const normalized = message.trim()
    if (!normalized || normalized.length > 10_000 || normalized.includes("\0")) throw new Error("Invalid commit message")
    await this.git(["commit", "-m", normalized])
  }

  private async canonicalRoot() {
    if (this.root) return this.root
    const requested = await realpath(this.requestedRoot)
    const topLevel = await this.run(requested, ["rev-parse", "--show-toplevel"])
    const canonical = await realpath(topLevel.trim())
    if (relative(requested, canonical) !== "") throw new Error("Git repository root does not match the configured workspace")
    this.root = canonical
    return canonical
  }

  private async git(args: readonly string[]) { return this.run(await this.canonicalRoot(), args) }
  private async run(cwd: string, args: readonly string[]) {
    const { stdout } = await execFile("git", [...args], {
      cwd,
      encoding: "utf8",
      timeout: 15_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      env: { NODE_ENV: process.env.NODE_ENV, PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ComSpec: process.env.ComSpec, HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never", LC_ALL: "C" },
    })
    return stdout
  }
}

function assertSafePath(path: string) {
  const normalized = path.replaceAll("\\", "/")
  if (!normalized || normalized.includes("\0") || isAbsolute(path) || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) throw new Error("Invalid Git path")
}

function parseBranchHeader(header: string) {
  const value = header.replace(/^## /, "")
  if (value.startsWith("HEAD ")) return { branch: null, upstream: null, ahead: 0, behind: 0 }
  const [relationship, divergence = ""] = value.split(" [")
  const [branch, upstream] = relationship.split("...")
  return { branch: branch || null, upstream: upstream || null, ahead: Number(divergence.match(/ahead (\d+)/)?.[1] ?? 0), behind: Number(divergence.match(/behind (\d+)/)?.[1] ?? 0) }
}

function parseChanges(tokens: string[]): GitChange[] {
  const result: GitChange[] = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const x = token[0]
    const y = token[1]
    let path = token.slice(3).replaceAll("\\", "/")
    if (x === "R" || x === "C") { const original = tokens[++index]; if (original) path = path || original }
    const conflict = ["DD", "AU", "UD", "UA", "DU", "AA", "UU"].includes(`${x}${y}`)
    result.push({ path, staged: conflict ? "conflicted" : x === "?" ? null : kind(x), unstaged: conflict ? "conflicted" : kind(y) })
  }
  return result
}

function kind(code: string): ChangeKind | null {
  if (code === "?" ) return "untracked"
  if (code === "A") return "added"
  if (code === "M") return "modified"
  if (code === "D") return "deleted"
  if (code === "R") return "renamed"
  if (code === "C") return "copied"
  if (code === "U") return "conflicted"
  return null
}
