import { lstat, readFile, readdir, realpath } from "node:fs/promises"
import { isAbsolute, relative, resolve, sep } from "node:path"
import type { ProjectFileEvidence, ProjectFileReaderPort } from "../ports"

export type InspectionLimits = Readonly<{ maxDepth: number; maxEntries: number; maxTotalBytes: number; maxFileBytes: number; timeoutMs: number }>
const defaults: InspectionLimits = { maxDepth: 4, maxEntries: 2_000, maxTotalBytes: 8 * 1024 * 1024, maxFileBytes: 1024 * 1024, timeoutMs: 5_000 }
const exactNames = new Set(["package.json", "pnpm-lock.yaml", "package-lock.json", "npm-shrinkwrap.json", "bun.lock", "bun.lockb", "pnpm-workspace.yaml"])

function contained(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

export class BoundedProjectReader implements ProjectFileReaderPort {
  private readonly limits: InspectionLimits
  constructor(private readonly options: { resolveRoot(rootRef: string): Promise<string>; limits?: InspectionLimits }) {
    this.limits = options.limits ?? defaults
  }

  async readEvidence(rootRef: string): Promise<readonly ProjectFileEvidence[]> {
    const startedAt = Date.now()
    const root = await realpath(await this.options.resolveRoot(rootRef))
    const evidence: ProjectFileEvidence[] = []
    let entries = 0
    let totalBytes = 0
    const visit = async (directory: string, depth: number): Promise<void> => {
      if (Date.now() - startedAt > this.limits.timeoutMs) throw new Error("Inspection deadline exceeded")
      if (depth > this.limits.maxDepth) return
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        entries += 1
        if (entries > this.limits.maxEntries) throw new Error("Inspection entry limit exceeded")
        const candidate = resolve(directory, entry.name)
        const actual = await realpath(candidate)
        if (!contained(root, actual)) throw new Error("Inspection path escaped project root")
        const stat = await lstat(candidate)
        if (stat.isSymbolicLink()) {
          if (!contained(root, actual)) throw new Error("Inspection path escaped project root")
          continue
        }
        if (entry.isDirectory()) { await visit(actual, depth + 1); continue }
        if (!entry.isFile() || !exactNames.has(entry.name)) continue
        if (stat.size > this.limits.maxFileBytes) throw new Error("Inspection file byte limit exceeded")
        totalBytes += stat.size
        if (totalBytes > this.limits.maxTotalBytes) throw new Error("Inspection total byte limit exceeded")
        evidence.push({ relativePath: relative(root, actual).split(sep).join("/"), content: await readFile(actual, "utf8"), size: stat.size })
      }
    }
    await visit(root, 0)
    return evidence.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  }
}
