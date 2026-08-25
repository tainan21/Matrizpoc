import { createHash, randomUUID } from "node:crypto"
import { lstat, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises"
import { extname, isAbsolute, join, relative, sep } from "node:path"

const maxBytes = 2 * 1024 * 1024
const textExtensions = new Set([".css", ".html", ".js", ".jsx", ".json", ".md", ".mjs", ".cjs", ".ts", ".tsx", ".txt", ".yaml", ".yml"])

export interface WorkspaceFileSnapshot {
  projectId: string
  path: string
  content: string
  version: string
  bytes: number
}

export class WorkspaceFileRepository {
  constructor(private readonly options: { resolveProject(projectId: string): Promise<string | undefined> }) {}

  async read(projectId: string, path: string): Promise<WorkspaceFileSnapshot> {
    const target = await this.resolve(projectId, path)
    const file = await stat(target)
    if (file.size > maxBytes) throw new Error("File is larger than 2 MiB")
    const content = await readFile(target, "utf8")
    return { projectId, path, content, version: versionOf(content), bytes: file.size }
  }

  async write(projectId: string, path: string, content: string, expectedVersion: string): Promise<WorkspaceFileSnapshot> {
    if (Buffer.byteLength(content, "utf8") > maxBytes) throw new Error("File is larger than 2 MiB")
    const target = await this.resolve(projectId, path)
    const current = await readFile(target, "utf8")
    if (versionOf(current) !== expectedVersion) throw new Error("File changed on disk")
    const temporary = `${target}.matriz-control-${randomUUID()}.tmp`
    try {
      await writeFile(temporary, content, { encoding: "utf8", flag: "wx" })
      await rename(temporary, target)
    } finally {
      await rm(temporary, { force: true })
    }
    return this.read(projectId, path)
  }

  private async resolve(projectId: string, path: string) {
    if (!path || isAbsolute(path) || path.split(/[\\/]/).some((part) => part === ".." || part === "")) throw new Error("Invalid relative path")
    if (!textExtensions.has(extname(path).toLowerCase())) throw new Error("Unsupported text file")
    const configuredRoot = await this.options.resolveProject(projectId)
    if (!configuredRoot) throw new Error("Unknown project")
    const root = await realpath(configuredRoot)
    const candidate = join(root, path)
    const link = await lstat(candidate)
    if (link.isSymbolicLink()) throw new Error("Symbolic links are not allowed")
    const resolved = await realpath(candidate)
    const rel = relative(root, resolved)
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error("Path escapes project")
    return resolved
  }
}

function versionOf(content: string) { return createHash("sha256").update(content).digest("hex") }
