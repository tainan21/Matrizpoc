import { describe, expect, it } from "vitest"
import type { BrowserWindow, IpcMainInvokeEvent } from "electron"
import { assertTrustedShell, isShellUrl } from "./trusted-shell.js"

describe("trusted shell", () => {
  it("matches the exact entry document, allowing only fragment changes", () => {
    const expected = "file:///C:/NAEVIA/dist/index.html"
    expect(isShellUrl(`${expected}#terminal`, expected)).toBe(true)
    for (const candidate of ["https://example.test/dist/index.html", `${expected}?other`, `${expected}/other`, "file:///C:/Other/dist/index.html", "invalid"]) {
      expect(isShellUrl(candidate, expected)).toBe(false)
    }
  })

  it("rejects missing, closed, foreign and child-frame senders before invoking native actions", () => {
    const url = "file:///C:/NAEVIA/dist/index.html"
    const frame = { url }
    const contents = { mainFrame: frame }
    const window = { isDestroyed: () => false, webContents: contents } as unknown as BrowserWindow
    const event = { sender: contents, senderFrame: frame } as unknown as IpcMainInvokeEvent
    expect(() => assertTrustedShell(event, window, url)).not.toThrow()
    expect(() => assertTrustedShell(event, undefined, url)).toThrow("origem não autorizada")
    expect(() => assertTrustedShell(event, { ...window, isDestroyed: () => true } as BrowserWindow, url)).toThrow()
    expect(() => assertTrustedShell({ ...event, sender: {} } as IpcMainInvokeEvent, window, url)).toThrow()
    expect(() => assertTrustedShell({ ...event, senderFrame: null }, window, url)).toThrow()
    expect(() => assertTrustedShell({ ...event, senderFrame: { url } } as IpcMainInvokeEvent, window, url)).toThrow()
    frame.url = "https://example.test/"
    expect(() => assertTrustedShell(event, window, url)).toThrow()
  })
})
