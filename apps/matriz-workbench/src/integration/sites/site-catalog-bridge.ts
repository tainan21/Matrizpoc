import { readFile, readdir, realpath, stat } from "node:fs/promises"
import path from "node:path"
import { z } from "zod"
import { WorkspaceError } from "../../domain/errors"

const siteId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/)
const siteProjectionSchema = z.object({
  schemaVersion: z.literal(1),
  id: siteId,
  name: z.string().trim().min(1).max(120),
  status: z.enum(["draft", "active", "archived"]),
  presetId: siteId,
  defaultLocale: z.string(),
  locales: z.array(z.string()).min(1).max(10),
  metadata: z.object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    canonicalPath: z.string().trim().min(1).optional(),
    openGraphImage: z.string().trim().min(1).optional(),
    icons: z.array(z.string()).min(1).optional(),
  }),
})

export interface SiteSummary {
  id: string
  name: string
  status: "draft" | "active" | "archived"
  presetId: string
  defaultLocale: string
  locales: string[]
  metadataCompleteness: {
    completed: number
    total: number
    missing: string[]
  }
}

export class SiteCatalogBridge {
  private constructor(private readonly sitesRoot: string) {}

  static async create(repositoryRoot: string): Promise<SiteCatalogBridge> {
    const root = await realpath(path.resolve(repositoryRoot))
    const sitesRoot = await realpath(
      path.join(root, "apps", "sites", "sites"),
    ).catch(() => {
      throw new WorkspaceError("App Sites não encontrado.", "NOT_FOUND")
    })
    return new SiteCatalogBridge(sitesRoot)
  }

  private async project(siteIdValue: string): Promise<SiteSummary> {
    if (!siteId.safeParse(siteIdValue).success) {
      throw new WorkspaceError("Site ID inválido.", "INVALID_PATH")
    }
    const target = path.join(this.sitesRoot, siteIdValue, "site.json")
    const metadata = await stat(target).catch(() => undefined)
    if (!metadata?.isFile() || metadata.size > 128_000) {
      throw new WorkspaceError("Configuração do site não encontrada.", "NOT_FOUND")
    }
    const parsed = siteProjectionSchema.parse(
      JSON.parse(await readFile(target, "utf8")),
    )
    if (parsed.id !== siteIdValue) {
      throw new WorkspaceError(
        "Pasta e identificador do site não correspondem.",
        "INVALID_DATA",
      )
    }
    const fields = [
      "title",
      "description",
      "canonicalPath",
      "openGraphImage",
      "icons",
    ] as const
    const missing = fields
      .filter((field) => !parsed.metadata[field])
      .sort()
    return {
      id: parsed.id,
      name: parsed.name,
      status: parsed.status,
      presetId: parsed.presetId,
      defaultLocale: parsed.defaultLocale,
      locales: parsed.locales,
      metadataCompleteness: {
        completed: fields.length - missing.length,
        total: fields.length,
        missing,
      },
    }
  }

  async listSites(): Promise<SiteSummary[]> {
    const entries = await readdir(this.sitesRoot, { withFileTypes: true })
    const sites = await Promise.all(
      entries
        .filter(
          (entry) =>
            entry.isDirectory() &&
            !entry.isSymbolicLink() &&
            siteId.safeParse(entry.name).success,
        )
        .map((entry) => this.project(entry.name)),
    )
    return sites.sort((left, right) =>
      left.name.localeCompare(right.name, "pt-BR"),
    )
  }

  async getSite(siteIdValue: string): Promise<SiteSummary> {
    return this.project(siteIdValue)
  }
}
