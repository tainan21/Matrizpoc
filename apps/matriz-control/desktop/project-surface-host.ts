import { BrowserWindow, WebContentsView, shell } from "electron"
import { assessEmbedding, isAllowedSurfaceNavigation, resolveApprovedSurfaceUrl } from "../src/integration/desktop/project-surface-policy"

export type ProjectSurfaceOpenSpec = Readonly<{ projectId: string; surfaceId: string; port: number; path: string | null; kind: "embedded-web" | "external-browser" | "terminal" | "service-only" }>
export type ProjectSurfaceOpenResult = { mode: "embedded"; key: string; url: string; view: WebContentsView } | { mode: "external"; url: string; reason: string } | { mode: "service_only" }

export class ProjectSurfaceHost {
  async open(window: BrowserWindow, spec: ProjectSurfaceOpenSpec): Promise<ProjectSurfaceOpenResult> {
    if (spec.kind === "service-only" || spec.kind === "terminal") return { mode: "service_only" }
    const resolved = resolveApprovedSurfaceUrl(spec.port, spec.path)
    if (spec.kind === "external-browser") { await shell.openExternal(resolved.url); return { mode: "external", url: resolved.url, reason: "surface-policy" } }
    let response: Response
    try { response = await fetch(resolved.url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(5_000) }) }
    catch { await shell.openExternal(resolved.url); return { mode: "external", url: resolved.url, reason: "probe-failed" } }
    const compatibility = assessEmbedding(Object.fromEntries(response.headers.entries()))
    if (!compatibility.compatible) { await shell.openExternal(resolved.url); return { mode: "external", url: resolved.url, reason: compatibility.reason } }
    const partition = `project-host:${spec.projectId}:${spec.surfaceId}`
    const view = new WebContentsView({ webPreferences: { partition, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, allowRunningInsecureContent: false } })
    view.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
    view.webContents.on("will-navigate", (event, url) => { if (!isAllowedSurfaceNavigation(url, resolved.origin)) event.preventDefault() })
    view.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    view.webContents.session.on("will-download", (event) => event.preventDefault())
    window.contentView.addChildView(view)
    try { await view.webContents.loadURL(resolved.url) }
    catch {
      window.contentView.removeChildView(view)
      view.webContents.close()
      await shell.openExternal(resolved.url)
      return { mode: "external", url: resolved.url, reason: "load-failed" }
    }
    return { mode: "embedded", key: `project:${spec.projectId}:${spec.surfaceId}`, url: resolved.url, view }
  }
}
