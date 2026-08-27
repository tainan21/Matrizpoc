import type { LocalAppRuntime } from "./catalog"
import { localAppCatalog } from "./catalog"
import { readFile } from "node:fs/promises"
import path from "node:path"

export interface ResolvedLocalApp extends LocalAppRuntime {
  readonly packageName: string
}

export interface CatalogValidationResult {
  readonly apps: readonly LocalAppRuntime[]
  readonly issues: readonly string[]
}

export async function loadLocalAppCatalog(repositoryRoot: string): Promise<{
  apps: readonly ResolvedLocalApp[]
  issues: readonly string[]
}> {
  const basic = validateCatalogEntries(localAppCatalog)
  const issues = [...basic.issues]
  const apps: ResolvedLocalApp[] = []

  for (const app of localAppCatalog) {
    const appRoot = path.join(repositoryRoot, app.directory)
    try {
      const packageJson = JSON.parse(
        await readFile(path.join(appRoot, "package.json"), "utf8"),
      ) as { name?: unknown; private?: unknown; scripts?: Record<string, unknown> }
      if (typeof packageJson.name !== "string" || !packageJson.name) {
        issues.push(`${app.directory}/package.json must declare a package name.`)
        continue
      }
      if (packageJson.private !== true) issues.push(`${packageJson.name} must be private.`)
      if (typeof packageJson.scripts?.dev !== "string") {
        issues.push(`${packageJson.name} must declare scripts.dev.`)
      }

      const [manifestSource, publicContractSource] = await Promise.all([
        readFile(path.join(appRoot, "src", "manifest", "manifest.ts"), "utf8"),
        readFile(path.join(appRoot, "public-contract.ts"), "utf8"),
      ])
      const manifestAppId = manifestSource.match(/\bappId:\s*["']([^"']+)["']/)?.[1]
      if (manifestAppId !== app.appId) {
        issues.push(`${app.directory} manifest appId must be "${app.appId}".`)
      }
      if (!/export\s*\{\s*manifest\s*\}/.test(publicContractSource)) {
        issues.push(`${app.directory}/public-contract.ts must export only the manifest surface.`)
      }
      apps.push({ ...app, packageName: packageJson.name })
    } catch (error) {
      issues.push(`${app.directory} could not be inspected: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { apps, issues }
}

const SLUG = /^[a-z0-9][a-z0-9-]*$/
const APP_DIRECTORY = /^apps\/[a-z0-9][a-z0-9-]*$/

export function validateCatalogEntries(
  entries: readonly LocalAppRuntime[],
): CatalogValidationResult {
  const issues: string[] = []
  const slugs = new Set<string>()
  const appIds = new Set<string>()
  const directories = new Set<string>()
  const ports = new Set<number>()

  for (const app of entries) {
    if (!SLUG.test(app.slug)) issues.push(`Invalid slug "${app.slug}".`)
    if (!APP_DIRECTORY.test(app.directory)) {
      issues.push(`Invalid app directory "${app.directory}".`)
    }
    if (!Number.isInteger(app.preferredPort) || app.preferredPort < 1024 || app.preferredPort > 65535) {
      issues.push(`Preferred port ${app.preferredPort} must be between 1024 and 65535.`)
    }
    if (!app.healthPath.startsWith("/")) {
      issues.push(`Health path "${app.healthPath}" must start with "/".`)
    }

    if (slugs.has(app.slug)) issues.push(`Duplicate slug "${app.slug}".`)
    if (appIds.has(app.appId)) issues.push(`Duplicate appId "${app.appId}".`)
    if (directories.has(app.directory)) issues.push(`Duplicate directory "${app.directory}".`)
    if (ports.has(app.preferredPort)) issues.push(`Duplicate preferredPort ${app.preferredPort}.`)

    slugs.add(app.slug)
    appIds.add(app.appId)
    directories.add(app.directory)
    ports.add(app.preferredPort)
  }

  return { apps: entries, issues }
}

export function getLocalApp(
  entries: readonly LocalAppRuntime[],
  slug: string,
): LocalAppRuntime {
  const validation = validateCatalogEntries(entries)
  if (validation.issues.length) {
    throw new Error(`Invalid local app catalog:\n${validation.issues.join("\n")}`)
  }
  const app = entries.find((entry) => entry.slug === slug)
  if (!app) {
    throw new Error(`Unknown app "${slug}". Available: ${entries.map((entry) => entry.slug).join(", ")}.`)
  }
  return app
}
