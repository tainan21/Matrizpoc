import { createHash } from "node:crypto"
import { lstat, mkdir, open, readFile, readdir, realpath } from "node:fs/promises"
import path from "node:path"

export interface ImportFile {
  readonly path: string
  readonly absolutePath: string
  readonly contentHash?: string
  readonly reason?: string
}

export interface ImportInventory {
  readonly sourceRoot: string
  readonly included: readonly ImportFile[]
  readonly excluded: readonly ImportFile[]
}

export interface ImportOperation extends ImportFile {
  readonly targetPath: string
  readonly status: "copy" | "skip-existing-identical" | "conflict-existing"
}

export interface ImportPlan {
  readonly sourceRoot: string
  readonly targetRoot: string
  readonly operations: readonly ImportOperation[]
  readonly excluded: readonly ImportFile[]
}

const EXCLUDED_DIRECTORIES = new Set([".git", "node_modules", ".next", ".turbo", "dist", "build", "coverage"])
const sha256 = (content: Buffer) => createHash("sha256").update(content).digest("hex")
const safeSegment = /^[a-z0-9][a-z0-9-]*$/

function exclusionReason(name: string, directory: boolean): string | undefined {
  if (directory && EXCLUDED_DIRECTORIES.has(name)) return "excluded-directory"
  if (!directory && /^\.env(?:\..+)?$/.test(name) && name !== ".env.example") return "secret-environment-file"
  if (!directory && name.endsWith(".log")) return "runtime-log"
  return undefined
}

export async function inspectImportSource(source: string): Promise<ImportInventory> {
  const sourceRoot = await realpath(path.resolve(source))
  const included: ImportFile[] = []
  const excluded: ImportFile[] = []

  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name)
      const relativePath = path.relative(sourceRoot, absolutePath).split(path.sep).join("/")
      const metadata = await lstat(absolutePath)
      if (metadata.isSymbolicLink()) throw new Error(`Import source contains symbolic link: ${relativePath}`)
      const reason = exclusionReason(entry.name, metadata.isDirectory())
      if (reason) {
        excluded.push({ path: relativePath, absolutePath, reason })
        continue
      }
      if (metadata.isDirectory()) {
        await walk(absolutePath)
        continue
      }
      if (!metadata.isFile()) throw new Error(`Import source contains unsupported entry: ${relativePath}`)
      const content = await readFile(absolutePath)
      included.push({ path: relativePath, absolutePath, contentHash: sha256(content) })
    }
  }
  await walk(sourceRoot)
  included.sort((a, b) => a.path.localeCompare(b.path))
  excluded.sort((a, b) => a.path.localeCompare(b.path))
  return { sourceRoot, included, excluded }
}

export async function planSafeImport(
  repositoryRoot: string,
  slug: string,
  snapshotId: string,
  inventory: ImportInventory,
): Promise<ImportPlan> {
  if (!safeSegment.test(slug) || !safeSegment.test(snapshotId)) throw new Error("Invalid staging identity.")
  const targetRoot = path.join("migration-staging", slug, snapshotId).split(path.sep).join("/")
  const operations: ImportOperation[] = []
  for (const file of inventory.included) {
    const targetPath = `${targetRoot}/${file.path}`
    const target = path.join(repositoryRoot, targetPath)
    const existing = await readFile(target).catch(() => undefined)
    operations.push({
      ...file,
      targetPath,
      status: existing === undefined
        ? "copy"
        : sha256(existing) === file.contentHash
          ? "skip-existing-identical"
          : "conflict-existing",
    })
  }
  return { sourceRoot: inventory.sourceRoot, targetRoot, operations, excluded: inventory.excluded }
}

export async function applySafeImport(
  repositoryRoot: string,
  plan: ImportPlan,
): Promise<{ created: string[]; skipped: string[] }> {
  const conflicts = plan.operations.filter((operation) => operation.status === "conflict-existing")
  if (conflicts.length) throw new Error(`Refusing import with conflicting files: ${conflicts.map((item) => item.targetPath).join(", ")}`)
  const stagingRoot = path.resolve(repositoryRoot, "migration-staging")
  const created: string[] = []
  const skipped: string[] = []
  for (const operation of plan.operations) {
    if (operation.status === "skip-existing-identical") {
      skipped.push(operation.targetPath)
      continue
    }
    const target = path.resolve(repositoryRoot, operation.targetPath)
    if (!target.startsWith(`${stagingRoot}${path.sep}`)) throw new Error(`Unsafe staging target: ${operation.targetPath}`)
    await mkdir(path.dirname(target), { recursive: true })
    const content = await readFile(operation.absolutePath)
    if (sha256(content) !== operation.contentHash) throw new Error(`Source changed after preview: ${operation.path}`)
    const handle = await open(target, "wx")
    try {
      await handle.writeFile(content)
      await handle.sync()
    } finally {
      await handle.close()
    }
    created.push(operation.targetPath)
  }
  return { created, skipped }
}
