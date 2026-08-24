import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import type { HealthCheckTarget } from "./domain"

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const

async function exists(candidate: string): Promise<boolean> {
  try {
    await stat(candidate)
    return true
  } catch {
    return false
  }
}

export async function findHealthCheckWorkspaceRoot(startDirectory = process.cwd()): Promise<string> {
  let candidate = path.resolve(startDirectory)
  while (true) {
    const hasWorkspace = await exists(path.join(candidate, "pnpm-workspace.yaml"))
    const hasHub = await exists(path.join(candidate, "apps", "matriz-hub"))
    if (hasWorkspace && hasHub) return candidate
    const parent = path.dirname(candidate)
    if (parent === candidate) {
      throw new Error("Não foi possível localizar a raiz do workspace Matriz.")
    }
    candidate = parent
  }
}

export interface RegisteredHealthApp {
  readonly appId: string
  readonly name: string
  readonly baseUrl: string
  readonly routes: readonly string[]
}

export interface HealthEnvironmentProfile {
  readonly name: string
  readonly baseUrls: Readonly<Record<string, string>>
}

function validateBaseUrl(value: unknown, profile: string, appId: string): string {
  if (typeof value !== "string") {
    throw new Error(`URL inválida para ${appId} no ambiente ${profile}.`)
  }
  const url = new URL(value)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`A URL de ${appId} em ${profile} precisa usar HTTP ou HTTPS.`)
  }
  if (url.username || url.password) {
    throw new Error(`A URL de ${appId} em ${profile} não pode conter credenciais.`)
  }
  return url.toString().replace(/\/$/, "")
}

export function loadHealthEnvironmentProfiles(
  apps: readonly RegisteredHealthApp[],
  localEnvironment: string,
  rawProfiles?: string,
): readonly HealthEnvironmentProfile[] {
  const knownApps = new Set(apps.map((app) => app.appId))
  const profiles: HealthEnvironmentProfile[] = [{
    name: localEnvironment,
    baseUrls: Object.fromEntries(apps.map((app) => [app.appId, app.baseUrl])),
  }]
  if (!rawProfiles?.trim()) return profiles

  let parsed: unknown
  try {
    parsed = JSON.parse(rawProfiles)
  } catch {
    throw new Error("MYHUB_HEALTH_PROFILES_JSON precisa conter um objeto JSON válido.")
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("MYHUB_HEALTH_PROFILES_JSON precisa mapear ambientes para apps.")
  }

  for (const [profileName, configuredApps] of Object.entries(parsed)) {
    if (!/^[a-z0-9][a-z0-9_-]{0,31}$/i.test(profileName)) {
      throw new Error(`Nome de ambiente inválido: ${profileName}.`)
    }
    if (profileName === localEnvironment) {
      throw new Error(`O ambiente ${profileName} já é fornecido pelo registry local.`)
    }
    if (!configuredApps || typeof configuredApps !== "object" || Array.isArray(configuredApps)) {
      throw new Error(`O ambiente ${profileName} precisa mapear appId para URL.`)
    }

    const baseUrls: Record<string, string> = {}
    for (const [appId, value] of Object.entries(configuredApps)) {
      if (!knownApps.has(appId)) {
        throw new Error(`O ambiente ${profileName} contém app desconhecido: ${appId}.`)
      }
      baseUrls[appId] = validateBaseUrl(value, profileName, appId)
    }
    profiles.push({ name: profileName, baseUrls })
  }

  return profiles
}

function targetUrl(baseUrl: string, route: string): string {
  return new URL(route, `${baseUrl.replace(/\/$/, "")}/`).toString()
}

export function createRouteTargets(
  apps: readonly RegisteredHealthApp[],
  profile: HealthEnvironmentProfile,
): readonly HealthCheckTarget[] {
  return apps.flatMap((app) => {
    const baseUrl = profile.baseUrls[app.appId]
    if (!baseUrl) return []
    return app.routes.map((route) => ({
      appId: app.appId,
      project: app.name,
      environment: profile.name,
      route,
      url: targetUrl(baseUrl, route),
      method: "GET" as const,
      probeMode: "content" as const,
    }))
  })
}

async function collectRouteFiles(directory: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }

  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectRouteFiles(entryPath)
    if (entry.isFile() && entry.name === "route.ts") return [entryPath]
    return []
  }))
  return files.flat()
}

function exportedMethods(source: string): Set<string> {
  const methods = new Set<string>()
  const directPattern = /export\s+(?:(?:async\s+)?function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g
  for (const match of source.matchAll(directPattern)) {
    if (match[1]) methods.add(match[1])
  }
  const reexportPattern = /export\s*\{([^}]+)\}/g
  for (const match of source.matchAll(reexportPattern)) {
    for (const method of HTTP_METHODS) {
      if (new RegExp(`\\b${method}\\b`).test(match[1] ?? "")) methods.add(method)
    }
  }
  return methods
}

function routeDetails(apiRoot: string, routeFile: string): {
  route: string
  requestRoute: string
  dynamic: boolean
} {
  const segments = path.relative(apiRoot, path.dirname(routeFile)).split(path.sep)
  const routeSegments = ["api", ...segments]
  const dynamic = routeSegments.some((segment) => segment.includes("["))
  const requestSegments = routeSegments.flatMap((segment) => {
    if (/^\[\.\.\..+\]$/.test(segment) || /^\[\[\.\.\..+\]\]$/.test(segment)) {
      return ["__healthcheck__", "path"]
    }
    if (/^\[.+\]$/.test(segment)) return ["__healthcheck__"]
    return [segment]
  })
  return {
    route: `/${routeSegments.join("/")}`,
    requestRoute: `/${requestSegments.join("/")}`,
    dynamic,
  }
}

export async function discoverApiTargets(
  workspaceRoot: string,
  apps: readonly RegisteredHealthApp[],
  profile: HealthEnvironmentProfile,
): Promise<readonly HealthCheckTarget[]> {
  const targets = await Promise.all(apps.map(async (app) => {
    const baseUrl = profile.baseUrls[app.appId]
    if (!baseUrl) return []
    if (!/^[a-z0-9-]+$/i.test(app.appId)) {
      throw new Error(`appId inválido para descoberta de APIs: ${app.appId}.`)
    }
    const apiRoot = path.join(workspaceRoot, "apps", app.appId, "app", "api")
    const files = await collectRouteFiles(apiRoot)
    return Promise.all(files.map(async (routeFile) => {
      const source = await readFile(routeFile, "utf8")
      const methods = exportedMethods(source)
      const details = routeDetails(apiRoot, routeFile)
      const canReadContent = !details.dynamic && methods.has("GET")
      return {
        appId: app.appId,
        project: app.name,
        environment: profile.name,
        route: details.route,
        url: targetUrl(baseUrl, details.requestRoute),
        method: canReadContent ? "GET" as const : "OPTIONS" as const,
        probeMode: canReadContent ? "content" as const : "reachability" as const,
      }
    }))
  }))

  return targets.flat().sort((left, right) =>
    left.appId.localeCompare(right.appId) || left.route.localeCompare(right.route),
  )
}
