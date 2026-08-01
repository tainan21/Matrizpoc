import { readFile, readdir, realpath, stat } from "node:fs/promises"
import path from "node:path"
import {
  resolveSiteDefinition,
  siteDefinitionSchema,
  siteMessagesSchema,
  sitePresetSchema,
  type ResolvedSiteDefinition,
  type SiteMessages,
} from "../domain/site-config"

const SITE_ID = /^[a-z0-9][a-z0-9-]*$/
const LOCALE = /^[a-z]{2}(?:-[A-Z]{2})?$/
const MAX_JSON_BYTES = 128_000

async function readJson(target: string): Promise<unknown> {
  const metadata = await stat(target).catch(() => undefined)
  if (!metadata?.isFile() || metadata.size > MAX_JSON_BYTES) {
    throw new Error(`Configuration not found or above limit: ${target}`)
  }
  return JSON.parse(await readFile(target, "utf8")) as unknown
}

export interface LoadedSite {
  site: ResolvedSiteDefinition
  locale: string
  fallback: boolean
  messages: SiteMessages
}

export interface SiteHealth {
  siteId: string
  completeLocales: string[]
  missingAssets: string[]
}

export class FileSiteCatalog {
  private constructor(
    readonly appRoot: string,
    private readonly sitesRoot: string,
    private readonly publicRoot: string,
  ) {}

  static async create(appRoot: string): Promise<FileSiteCatalog> {
    const root = await realpath(path.resolve(appRoot))
    const sitesRoot = await realpath(path.join(root, "sites"))
    const publicRoot = await realpath(path.join(root, "public"))
    return new FileSiteCatalog(root, sitesRoot, publicRoot)
  }

  private assertSiteId(siteId: string): void {
    if (!SITE_ID.test(siteId)) throw new Error("Invalid site id.")
  }

  private async definition(siteId: string): Promise<ResolvedSiteDefinition> {
    this.assertSiteId(siteId)
    const site = siteDefinitionSchema.parse(
      await readJson(path.join(this.sitesRoot, siteId, "site.json")),
    )
    if (site.id !== siteId) throw new Error("Site folder and id do not match.")
    const preset = sitePresetSchema.parse(
      await readJson(
        path.join(this.sitesRoot, "_presets", `${site.presetId}.json`),
      ),
    )
    return resolveSiteDefinition(preset, site)
  }

  async listSites(): Promise<ResolvedSiteDefinition[]> {
    const entries = await readdir(this.sitesRoot, { withFileTypes: true })
    const sites = await Promise.all(
      entries
        .filter(
          (entry) =>
            entry.isDirectory() &&
            !entry.isSymbolicLink() &&
            SITE_ID.test(entry.name),
        )
        .map((entry) => this.definition(entry.name)),
    )
    return sites.sort((left, right) =>
      left.name.localeCompare(right.name, "pt-BR"),
    )
  }

  async getSite(siteId: string, requestedLocale: string): Promise<LoadedSite> {
    const site = await this.definition(siteId)
    const requestedIsValid =
      LOCALE.test(requestedLocale) && site.locales.includes(requestedLocale)
    const locale = requestedIsValid ? requestedLocale : site.defaultLocale
    const messages = siteMessagesSchema.parse(
      await readJson(
        path.join(this.sitesRoot, siteId, "messages", `${locale}.json`),
      ),
    )
    return {
      site,
      locale,
      fallback: locale !== requestedLocale,
      messages,
    }
  }

  async inspectSite(siteId: string): Promise<SiteHealth> {
    const site = await this.definition(siteId)
    const completeLocales: string[] = []
    for (const locale of site.locales) {
      try {
        siteMessagesSchema.parse(
          await readJson(
            path.join(this.sitesRoot, siteId, "messages", `${locale}.json`),
          ),
        )
        completeLocales.push(locale)
      } catch {
        // Health reports incomplete locale files without hiding the site.
      }
    }
    const assets = [
      site.metadata.openGraphImage,
      ...(site.metadata.icons ?? []),
    ].filter((asset): asset is string => Boolean(asset))
    const missingAssets: string[] = []
    for (const asset of assets) {
      const relative = asset.replace(/^\/+/, "")
      if (relative.split("/").includes("..")) {
        missingAssets.push(asset)
        continue
      }
      const target = path.join(this.publicRoot, ...relative.split("/"))
      const available = await stat(target)
        .then((metadata) => metadata.isFile())
        .catch(() => false)
      if (!available) missingAssets.push(asset)
    }
    return {
      siteId,
      completeLocales: completeLocales.sort(),
      missingAssets: missingAssets.sort(),
    }
  }
}
