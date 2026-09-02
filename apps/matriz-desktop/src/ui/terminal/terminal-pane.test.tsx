import "@testing-library/jest-dom/vitest"

import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { TerminalSession } from "../../domain/types"
import { TerminalPane } from "./terminal-pane"

const xterm = vi.hoisted(() => ({
  input: undefined as ((data: string) => void) | undefined,
  cols: 80,
  rows: 24,
}))

vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    cols = xterm.cols
    rows = xterm.rows
    loadAddon() {}
    open() {}
    write() {}
    focus() {}
    dispose() {}
    onData(listener: (data: string) => void) {
      xterm.input = listener
      return { dispose() {} }
    }
  },
}))

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class { fit() {} },
}))

const session: TerminalSession = {
  id: "shell-a",
  title: "PowerShell",
  kind: "shell",
  status: "running",
  cwd: "C:\\workspace",
  tail: "",
}

describe("TerminalPane failures", () => {
  beforeEach(() => {
    xterm.input = undefined
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    })
  })
  afterEach(cleanup)

  it("reports native input failures to the terminal runtime", async () => {
    const reportError = vi.fn()
    const gateway = {
      writeTerminal: vi.fn().mockRejectedValue(new Error("PTY não aceitou a entrada")),
      resizeTerminal: vi.fn().mockResolvedValue(undefined),
    } as unknown as DesktopGateway

    render(
      <TerminalPane
        session={session}
        gateway={gateway}
        register={() => () => undefined}
        reportError={reportError}
      />,
    )
    await act(async () => Promise.resolve())
    await act(async () => { xterm.input?.("olá") })

    expect(gateway.writeTerminal).toHaveBeenCalledWith("shell-a", "olá")
    expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: "PTY não aceitou a entrada" }))
  })
})
