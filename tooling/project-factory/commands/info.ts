import type { LocalAppRuntime } from "../catalog"

export function runtimeUrl(app: LocalAppRuntime): string {
  return `http://${app.host}:${app.preferredPort}`
}

export function formatAppInfo(app: LocalAppRuntime, packageName: string): string {
  const url = runtimeUrl(app)
  return [
    `App: ${app.appId} (${app.slug})`,
    `Package: ${packageName}`,
    `Directory: ${app.directory}`,
    `URL: ${url}`,
    `Health: ${url}${app.healthPath}`,
    `Lifecycle: ${app.lifecycle}`,
  ].join("\n")
}
