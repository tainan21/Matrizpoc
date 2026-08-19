import { existsSync, readdirSync } from "node:fs"
import { join, relative, sep } from "node:path"

export const apps = [
  { id: "matriz-hub", host: "localhost", port: 3000 },
  { id: "spot", host: "localhost", port: 3001 },
  { id: "matriz-admin", host: "localhost", port: 3002 },
  { id: "seumei", directory: "seumeiapp", host: "localhost", port: 3008 },
  { id: "contracts", host: "localhost", port: 3003 },
  { id: "willdash", host: "localhost", port: 3004 },
  { id: "matriz-workbench", host: "127.0.0.1", port: 3005 },
  { id: "sites", host: "127.0.0.1", port: 3006 },
]

const accessRoutes = new Set([
  "matriz-hub:/login",
  "spot:/login",
  "matriz-admin:/login",
  "seumei:/login",
  "contracts:/login",
  "willdash:/login",
  "matriz-workbench:/unlock",
])

const tvRoutes = new Set([
  "matriz-hub:/health",
  "matriz-hub:/telemetry",
  "spot:/login",
  "spot:/gigs",
  "matriz-admin:/login",
  "matriz-admin:/establishments",
  "seumei:/login",
  "contracts:/login",
  "contracts:/contracts",
  "willdash:/login",
  "willdash:/goals",
  "matriz-workbench:/",
  "matriz-workbench:/control",
  "sites:/",
  "sites:/preview/example/pt-BR",
])

export const viewports = Object.freeze({
  desktop: Object.freeze({ width: 1440, height: 1000 }),
  mobile: Object.freeze({ width: 390, height: 844 }),
  tv: Object.freeze({ width: 1920, height: 1080 }),
})

export const viewportOrder = Object.freeze(["desktop", "mobile", "tv"])

export const fallbackSegments = Object.freeze({
  docId: "sample-document",
  contextId: "sample-context",
  entityId: "sample-entity",
  id: "matriz%3Ahub",
  sourceId: "matriz-infra-hub",
  projectId: "matriz-infra-hub",
  sprintId: "sample-sprint",
  itemId: "sample-item",
  requestId: "sample-request",
  kind: "product",
  slug: "overview",
  siteId: "example",
  locale: "pt-BR",
})

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : entry.name === "page.tsx" ? [path] : []
  })
}

function toPattern(appDirectory, pageFile) {
  const parts = relative(join(appDirectory, "app"), pageFile)
    .split(sep)
    .slice(0, -1)
    .filter((part) => !(part.startsWith("(") && part.endsWith(")")))
  return `/${parts.join("/")}`.replace(/\/$/, "") || "/"
}

export function dynamicSegmentNames(pattern) {
  return [...pattern.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1])
}

export function resolveRoutePattern(pattern, resolved = {}) {
  const segmentResolution = {}
  const route = pattern.replace(/\[([^\]]+)\]/g, (_, name) => {
    const hasResolvedValue = typeof resolved[name] === "string" && resolved[name].length > 0
    const value = hasResolvedValue ? resolved[name] : (fallbackSegments[name] ?? `sample-${name}`)
    segmentResolution[name] = { value, source: hasResolvedValue ? "resolved" : "fallback" }
    return value
  })
  return { route, segmentResolution }
}

export function concreteRoute(pattern, resolved = {}) {
  return resolveRoutePattern(pattern, resolved).route
}

export function routeSlug(route) {
  return route === "/" ? "home" : route.slice(1).replace(/[^a-zA-Z0-9._-]+/g, "--")
}

export function routeMatchesPattern(route, pattern) {
  const expression = pattern
    .split("/")
    .map((segment) =>
      /^\[[^\]]+\]$/.test(segment) ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("/")
  return new RegExp(`^${expression}$`).test(route)
}

export function captureKey(item) {
  return `${item.viewport}:${item.app}:${item.pattern}`
}

export function remainingAttempts(previousResult) {
  const used = Number.isInteger(previousResult?.attempts) ? previousResult.attempts : 0
  return Math.max(0, 2 - used)
}

export function expectedCaptureItems(routes) {
  return routes.flatMap((route) => [
    { ...route, viewport: "desktop" },
    { ...route, viewport: "mobile" },
    ...(route.tv ? [{ ...route, viewport: "tv" }] : []),
  ])
}

export function mergeCaptureResults(previousResults, currentResults, requestedViewports, retrying) {
  const requested = new Set(requestedViewports)
  const replacements = new Set(currentResults.map(captureKey))
  const preserved = retrying
    ? previousResults.filter((item) => !replacements.has(captureKey(item)))
    : previousResults.filter((item) => !requested.has(item.viewport))
  return [...preserved, ...currentResults].sort(
    (a, b) =>
      (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER) ||
      viewportOrder.indexOf(a.viewport) - viewportOrder.indexOf(b.viewport),
  )
}

export function discoverRoutes(repoRoot, resolved = {}) {
  let index = 0
  return apps.flatMap((app) => {
    const appDirectory = join(repoRoot, "apps", app.directory ?? app.id)
    if (!existsSync(join(appDirectory, "app"))) return []
    return walk(join(appDirectory, "app"))
      .map((file) => toPattern(appDirectory, file))
      .sort((a, b) => a.localeCompare(b))
      .map((pattern) => {
        const { route, segmentResolution } = resolveRoutePattern(pattern, resolved)
        const key = `${app.id}:${route}`
        return {
          index: ++index,
          app: app.id,
          host: app.host,
          port: app.port,
          pattern,
          route,
          slug: routeSlug(route),
          access: accessRoutes.has(key),
          tv: tvRoutes.has(key),
          segmentResolution,
        }
      })
  })
}

export const expectedCounts = Object.freeze({ routes: 101, access: 6, tv: 14, captures: 216 })
