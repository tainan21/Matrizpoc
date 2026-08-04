import { execFile as execFileCallback } from "node:child_process"
import { realpath } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { WorkspaceError } from "../../domain/errors"

const execFile = promisify(execFileCallback)

export interface GitObservation {
  headCommit: string
  changedFiles: string[]
  commits: Array<{ id: string; requestIds: string[] }>
}

export class GitObservationProvider {
  constructor(private readonly repositoryRoot: string) {}

  private async git(args: string[]): Promise<string> {
    try {
      const result = await execFile("git", args, {
        cwd: this.repositoryRoot,
        encoding: "utf8",
        timeout: 10_000,
        maxBuffer: 512_000,
        windowsHide: true,
      })
      return result.stdout
    } catch {
      throw new WorkspaceError("Não foi possível observar o estado Git.", "NOT_FOUND")
    }
  }

  async observe(baseCommit: string): Promise<GitObservation> {
    if (!/^[0-9a-f]{40}$/.test(baseCommit)) {
      throw new WorkspaceError("A base Git precisa ser um commit completo.", "INVALID_DATA")
    }
    const [root, topLevel] = await Promise.all([
      realpath(this.repositoryRoot),
      this.git(["rev-parse", "--show-toplevel"]).then((value) => realpath(value.trim())),
    ])
    if (path.relative(root, topLevel) !== "") {
      throw new WorkspaceError("O provider Git está fora da raiz esperada.", "INVALID_PATH")
    }
    const [headCommit, tracked, untracked, log] = await Promise.all([
      this.git(["rev-parse", "HEAD"]),
      this.git(["diff", "--name-only", "-z", baseCommit]),
      this.git(["ls-files", "--others", "--exclude-standard", "-z"]),
      this.git(["log", "--format=%H%x1f%B%x1e", `${baseCommit}..HEAD`]),
    ])
    const changedFiles = Array.from(new Set(
      `${tracked}${untracked}`
        .split("\0")
        .map((value) => value.trim().replaceAll("\\", "/"))
        .filter(Boolean),
    )).sort()
    const commits = log
      .split("\x1e")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf("\x1f")
        const id = entry.slice(0, separator).trim()
        const body = entry.slice(separator + 1)
        const requestIds = Array.from(body.matchAll(
          /^Matriz-Request:\s*(req_[0-9a-f-]{36})\s*$/gim,
        )).map((match) => match[1])
        return { id, requestIds: Array.from(new Set(requestIds)) }
      })
    return {
      headCommit: headCommit.trim(),
      changedFiles,
      commits,
    }
  }

  async observeCurrent(): Promise<{ headCommit: string; dirtyPaths: string[] }> {
    const [headCommit, tracked, untracked] = await Promise.all([
      this.git(["rev-parse", "HEAD"]),
      this.git(["diff", "--name-only", "-z", "HEAD"]),
      this.git(["ls-files", "--others", "--exclude-standard", "-z"]),
    ])
    const dirtyPaths = Array.from(new Set(
      `${tracked}${untracked}`
        .split("\0")
        .map((value) => value.trim().replaceAll("\\", "/"))
        .filter(Boolean),
    )).sort()
    return { headCommit: headCommit.trim(), dirtyPaths }
  }
}
