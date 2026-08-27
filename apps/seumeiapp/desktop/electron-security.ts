import { decideNavigation } from "./navigation-policy"

export type WindowOpenDecision = { action: "deny"; openExternally: boolean }

export type ElectronSecurityPolicy = {
  browserWindowOptions: {
    partition: "persist:seumei"
    sandbox: true
    contextIsolation: true
    nodeIntegration: false
    webSecurity: true
  }
  permitsPermission: (permission: string) => false
  permitsDownload: () => false
  decideWindowOpen: (url: string) => WindowOpenDecision
  decideNavigation: (url: string) => "in-app" | "external" | "deny"
}

export function createElectronSecurityPolicy(allowedOrigins: readonly string[]): ElectronSecurityPolicy {
  const route = (url: string) => decideNavigation(url, allowedOrigins)

  return {
    browserWindowOptions: {
      partition: "persist:seumei",
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    permitsPermission: () => false,
    permitsDownload: () => false,
    decideWindowOpen: (url) => ({ action: "deny", openExternally: route(url) === "external" }),
    decideNavigation: route,
  }
}
