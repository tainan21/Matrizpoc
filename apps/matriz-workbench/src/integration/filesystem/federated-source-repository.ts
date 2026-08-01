import { createHash } from "node:crypto"
import {
  lstat,
  readFile,
  readdir,
  realpath,
  stat,
} from "node:fs/promises"
import path from "node:path"
import {
  federatedSourceRegistrySchema,
  localSourceBindingsSchema,
  type RegisteredSource,
  type RegisteredPackageSummary,
  type RegisteredSourceSummary,
  type RepositoryDocument,
  type RepositoryDocumentSummary,
} from "../../domain/federated-sources"
import { WorkspaceError } from "../../domain/errors"

const MAX_REGISTRY_BYTES = 256_000
const MAX_DOCUMENT_BYTES = 200_000
const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "output",
])

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  )
}

function normalizeRelative(value: string): string {
  return value.split(path.sep).join("/")
}

function assertSafeRelativeDocument(value: string): void {
  if (
    !value ||
    path.isAbsolute(value) ||
    value.includes("\\") ||
    value.split("/").some((segment) => segment === ".." || segment === ".") ||
    !value.toLowerCase().endsWith(".md")
  ) {
    throw new WorkspaceError(
      "Caminho de documento externo inválido.",
      "INVALID_PATH",
    )
  }
}

async function readBoundedJson(target: string): Promise<unknown> {
  const metadata = await stat(target).catch(() => undefined)
  if (!metadata) return undefined
  if (!metadata.isFile() || metadata.size > MAX_REGISTRY_BYTES) {
    throw new WorkspaceError(
      "Registro federado inválido ou acima do limite.",
      "INVALID_DATA",
    )
  }
  try {
    return JSON.parse(await readFile(target, "utf8"))
  } catch {
    throw new WorkspaceError("Registro federado corrompido.", "INVALID_DATA")
  }
}

function packageProjection(
  raw: unknown,
): { name?: string; version?: string; scripts: string[] } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { scripts: [] }
  }
  const value = raw as Record<string, unknown>
  const scripts =
    value.scripts &&
    typeof value.scripts === "object" &&
    !Array.isArray(value.scripts)
      ? Object.keys(value.scripts).slice(0, 100).sort()
      : []
  return {
    name:
      typeof value.name === "string" ? value.name.slice(0, 180) : undefined,
    version:
      typeof value.version === "string"
        ? value.version.slice(0, 80)
        : undefined,
    scripts,
  }
}

function keyProjection(value: unknown, limit = 100): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  return Object.keys(value).slice(0, limit).sort()
}

function packageContractProjection(
  sourceId: string,
  raw: unknown,
): RegisteredPackageSummary | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined
  const value = raw as Record<string, unknown>
  if (typeof value.name !== "string" || value.name.length > 180) return undefined
  return {
    sourceId,
    name: value.name,
    version:
      typeof value.version === "string"
        ? value.version.slice(0, 80)
        : undefined,
    exports: keyProjection(value.exports),
    dependencies: keyProjection(value.dependencies),
    peerDependencies: keyProjection(value.peerDependencies),
    scripts: keyProjection(value.scripts),
  }
}

function documentStatus(
  relativePath: string,
): RepositoryDocumentSummary["status"] {
  if (relativePath === "README.md" || relativePath === "AGENTS.md") {
    return "canonical"
  }
  if (relativePath.startsWith("docs/")) return "reference"
  if (relativePath.startsWith("doc/")) return "historical"
  return "unknown"
}

function documentCategory(relativePath: string): string {
  if (!relativePath.includes("/")) return "root"
  return relativePath.split("/")[0] ?? "root"
}

function documentTitle(content: string, relativePath: string): string {
  return (
    content.match(/^#\s+(.+)$/m)?.[1]?.trim().slice(0, 180) ||
    path.basename(relativePath, ".md")
  )
}

export class FederatedSourceRepository {
  private constructor(readonly repositoryRoot: string) {}

  static async create(repositoryRoot: string): Promise<FederatedSourceRepository> {
    const resolved = await realpath(path.resolve(repositoryRoot)).catch(() => {
      throw new WorkspaceError(
        "Raiz do portfólio federado não encontrada.",
        "NOT_FOUND",
      )
    })
    return new FederatedSourceRepository(resolved)
  }

  private async registry() {
    const raw = await readBoundedJson(
      path.join(this.repositoryRoot, ".matriz", "repositories.json"),
    )
    return federatedSourceRegistrySchema.parse(
      raw ?? { schemaVersion: 1, sources: [] },
    )
  }

  private async bindings() {
    const raw = await readBoundedJson(
      path.join(
        this.repositoryRoot,
        ".matriz",
        "local",
        "repository-bindings.json",
      ),
    )
    return localSourceBindingsSchema.parse(
      raw ?? { schemaVersion: 1, bindings: [] },
    )
  }

  async listSources(): Promise<RegisteredSource[]> {
    const [registry, bindings] = await Promise.all([
      this.registry(),
      this.bindings(),
    ])
    const bindingBySource = new Map(
      bindings.bindings.map((binding) => [binding.sourceId, binding]),
    )

    return Promise.all(
      registry.sources.map(async (source) => {
        const binding = bindingBySource.get(source.id)
        const absolutePath =
          binding?.enabled && path.isAbsolute(binding.absolutePath)
            ? path.resolve(binding.absolutePath)
            : undefined
        const available = absolutePath
          ? await stat(absolutePath)
              .then((metadata) => metadata.isDirectory())
              .catch(() => false)
          : false
        return {
          ...source,
          absolutePath,
          available,
          access: "read_only" as const,
        }
      }),
    )
  }

  private async source(sourceId: string): Promise<RegisteredSource & {
    absolutePath: string
  }> {
    const source = (await this.listSources()).find((item) => item.id === sourceId)
    if (!source) {
      throw new WorkspaceError("Fonte externa não registrada.", "NOT_FOUND")
    }
    if (!source.available || !source.absolutePath) {
      throw new WorkspaceError(
        "Fonte externa não está disponível nesta máquina.",
        "NOT_FOUND",
      )
    }
    const resolved = await realpath(source.absolutePath)
    return { ...source, absolutePath: resolved }
  }

  private async collectTree(
    sourceRoot: string,
    directory: string,
  ): Promise<string[]> {
    const directoryMetadata = await lstat(directory).catch(() => undefined)
    if (
      !directoryMetadata ||
      !directoryMetadata.isDirectory() ||
      directoryMetadata.isSymbolicLink()
    ) {
      return []
    }
    const resolvedDirectory = await realpath(directory)
    if (!isInside(sourceRoot, resolvedDirectory)) return []

    const results: string[] = []
    for (const entry of await readdir(resolvedDirectory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue
      const target = path.join(resolvedDirectory, entry.name)
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
          results.push(...(await this.collectTree(sourceRoot, target)))
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        results.push(target)
      }
    }
    return results
  }

  private async candidateFiles(
    source: RegisteredSource & { absolutePath: string },
  ): Promise<string[]> {
    const candidates = new Set<string>()
    for (const include of source.documentationIncludes) {
      if (include.endsWith("/**/*.md")) {
        const folder = include.slice(0, -"/**/*.md".length)
        const directory = path.join(source.absolutePath, ...folder.split("/"))
        for (const candidate of await this.collectTree(
          source.absolutePath,
          directory,
        )) {
          candidates.add(candidate)
        }
        continue
      }
      const target = path.join(source.absolutePath, ...include.split("/"))
      const metadata = await lstat(target).catch(() => undefined)
      if (metadata?.isFile() && !metadata.isSymbolicLink()) {
        candidates.add(target)
      }
    }
    return [...candidates]
  }

  private async summarize(
    sourceId: string,
    sourceRoot: string,
    target: string,
  ): Promise<RepositoryDocumentSummary | undefined> {
    const resolved = await realpath(target).catch(() => undefined)
    if (!resolved || !isInside(sourceRoot, resolved)) return undefined
    const metadata = await stat(resolved)
    if (!metadata.isFile() || metadata.size > MAX_DOCUMENT_BYTES) return undefined
    const relativePath = normalizeRelative(path.relative(sourceRoot, resolved))
    assertSafeRelativeDocument(relativePath)
    const content = await readFile(resolved, "utf8")
    return {
      sourceId,
      path: relativePath,
      title: documentTitle(content, relativePath),
      category: documentCategory(relativePath),
      status: documentStatus(relativePath),
      editable: false,
      bytes: Buffer.byteLength(content),
      hash: createHash("sha256").update(content).digest("hex").slice(0, 16),
    }
  }

  async listDocuments(sourceId: string): Promise<RepositoryDocumentSummary[]> {
    const source = await this.source(sourceId)
    const summaries = await Promise.all(
      (await this.candidateFiles(source)).map((target) =>
        this.summarize(source.id, source.absolutePath, target),
      ),
    )
    return summaries
      .filter(
        (document): document is RepositoryDocumentSummary =>
          document !== undefined,
      )
      .sort((left, right) => {
        const rank = { canonical: 0, reference: 1, historical: 2, unknown: 3 }
        return (
          rank[left.status] - rank[right.status] ||
          left.path.localeCompare(right.path, "en", { sensitivity: "base" })
        )
      })
  }

  async getSourceSummary(sourceId: string): Promise<RegisteredSourceSummary> {
    const source = await this.source(sourceId)
    const rootPackage = packageProjection(
      await readBoundedJson(path.join(source.absolutePath, "package.json")),
    )
    const packagesRoot = path.join(source.absolutePath, "packages")
    const rootMetadata = await lstat(packagesRoot).catch(() => undefined)
    const packages: RegisteredSourceSummary["packages"] = []
    if (rootMetadata?.isDirectory() && !rootMetadata.isSymbolicLink()) {
      const resolvedPackagesRoot = await realpath(packagesRoot)
      if (isInside(source.absolutePath, resolvedPackagesRoot)) {
        for (const entry of (await readdir(resolvedPackagesRoot, {
          withFileTypes: true,
        })).slice(0, 100)) {
          if (!entry.isDirectory() || entry.isSymbolicLink()) continue
          const packageRoot = path.join(resolvedPackagesRoot, entry.name)
          const resolvedPackageRoot = await realpath(packageRoot)
          if (!isInside(resolvedPackagesRoot, resolvedPackageRoot)) continue
          const projection = packageProjection(
            await readBoundedJson(path.join(resolvedPackageRoot, "package.json")),
          )
          if (projection.name) {
            packages.push({
              name: projection.name,
              version: projection.version,
            })
          }
        }
      }
    }
    packages.sort((left, right) => left.name.localeCompare(right.name))
    return {
      sourceId,
      packageName: rootPackage.name,
      version: rootPackage.version,
      scripts: rootPackage.scripts,
      packages,
    }
  }

  async getPackageSummary(
    sourceId: string,
    packageName: string,
  ): Promise<RegisteredPackageSummary> {
    if (
      !packageName ||
      packageName.length > 180 ||
      packageName.includes("\\") ||
      packageName.includes("..")
    ) {
      throw new WorkspaceError("Nome de package invÃ¡lido.", "INVALID_PATH")
    }
    const source = await this.source(sourceId)
    const packagesRoot = path.join(source.absolutePath, "packages")
    const packagesRootMetadata = await lstat(packagesRoot).catch(() => undefined)
    if (
      !packagesRootMetadata?.isDirectory() ||
      packagesRootMetadata.isSymbolicLink()
    ) {
      throw new WorkspaceError("Package nÃ£o encontrado.", "NOT_FOUND")
    }
    const resolvedPackagesRoot = await realpath(packagesRoot)
    if (!isInside(source.absolutePath, resolvedPackagesRoot)) {
      throw new WorkspaceError("Package nÃ£o encontrado.", "NOT_FOUND")
    }

    for (const entry of (await readdir(resolvedPackagesRoot, {
      withFileTypes: true,
    })).slice(0, 100)) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue
      const packageRoot = await realpath(
        path.join(resolvedPackagesRoot, entry.name),
      ).catch(() => undefined)
      if (!packageRoot || !isInside(resolvedPackagesRoot, packageRoot)) continue
      const projection = packageContractProjection(
        sourceId,
        await readBoundedJson(path.join(packageRoot, "package.json")),
      )
      if (projection?.name === packageName) return projection
    }

    throw new WorkspaceError("Package nÃ£o encontrado.", "NOT_FOUND")
  }

  async readDocument(
    sourceId: string,
    relativePath: string,
  ): Promise<RepositoryDocument> {
    assertSafeRelativeDocument(relativePath)
    const source = await this.source(sourceId)
    const summary = (await this.listDocuments(sourceId)).find(
      (document) => document.path === relativePath,
    )
    if (!summary) {
      throw new WorkspaceError(
        "Documento não pertence ao catálogo permitido.",
        "INVALID_PATH",
      )
    }
    const target = path.join(source.absolutePath, ...relativePath.split("/"))
    const resolved = await realpath(target)
    if (!isInside(source.absolutePath, resolved)) {
      throw new WorkspaceError(
        "Documento aponta para fora da fonte registrada.",
        "INVALID_PATH",
      )
    }
    return { ...summary, content: await readFile(resolved, "utf8") }
  }
}
