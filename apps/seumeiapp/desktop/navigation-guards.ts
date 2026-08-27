import { createElectronSecurityPolicy } from "./electron-security"
import { shouldShowOfflinePage } from "./load-failure"

type Event = { preventDefault: () => void }
type WebContentsLike = {
  on: (name: string, handler: (...args: any[]) => void) => unknown
  setWindowOpenHandler: (handler: (details: { url: string }) => { action: "deny" }) => unknown
}

export function attachNavigationGuards(webContents: WebContentsLike, allowedOrigins: readonly string[], openExternal: (url: string) => unknown, showOffline: (reason: string) => void): void {
  const security = createElectronSecurityPolicy(allowedOrigins)
  const guard = (event: Event, url: string) => {
    const decision = security.decideNavigation(url)
    if (decision === "in-app") return
    event.preventDefault()
    if (decision === "external") void openExternal(url)
  }
  webContents.setWindowOpenHandler(({ url }) => {
    const decision = security.decideWindowOpen(url)
    if (decision.openExternally) void openExternal(url)
    return { action: "deny" }
  })
  webContents.on("will-navigate", guard)
  webContents.on("will-redirect", guard)
  webContents.on("did-fail-load", (_event: unknown, errorCode: number, _description: string, validatedUrl: string, isMainFrame: boolean) => {
    if (shouldShowOfflinePage(errorCode, isMainFrame, validatedUrl, allowedOrigins)) showOffline("Não foi possível alcançar o Seumei configurado.")
  })
}
