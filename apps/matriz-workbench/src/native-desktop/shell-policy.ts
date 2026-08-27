const WORKBENCH_DESKTOP_ORIGIN = "http://127.0.0.1:3005"

export function createWorkbenchDesktopWebPreferences() {
  return {
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webSecurity: true,
  }
}

export function isAllowedWorkbenchDesktopUrl(candidate: string): boolean {
  try {
    return new URL(candidate).origin === WORKBENCH_DESKTOP_ORIGIN
  } catch {
    return false
  }
}
