import type { BrowserWindow, IpcMainInvokeEvent } from "electron"

export function isShellUrl(candidate: string, expected: string): boolean {
  try {
    const actual = new URL(candidate)
    const trusted = new URL(expected)
    actual.hash = ""
    trusted.hash = ""
    return actual.href === trusted.href
  } catch { return false }
}

export function assertTrustedShell(event: IpcMainInvokeEvent, window: BrowserWindow | undefined, url: string): void {
  // An identical URL is not sufficient: only the live shell's top frame owns IPC.
  if (!window || window.isDestroyed() || event.sender !== window.webContents ||
      !event.senderFrame || event.senderFrame !== window.webContents.mainFrame ||
      !isShellUrl(event.senderFrame.url, url)) {
    throw new Error("Solicitação nativa recusada: origem não autorizada")
  }
}
