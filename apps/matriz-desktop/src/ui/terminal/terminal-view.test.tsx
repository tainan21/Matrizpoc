import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { TerminalSession } from "../../domain/types"
import { createTerminalState } from "./terminal-store"
import { TerminalView } from "./terminal-view"

afterEach(cleanup)

const sessions: readonly TerminalSession[] = [
  {
    id: "shell-a",
    title: "PowerShell 7",
    kind: "shell",
    status: "running",
    cwd: "C:\\Apps\\matriz-infra-hub",
    tail: "PS C:\\Apps>",
  },
  {
    id: "build-b",
    title: "SEUMEI / BUILD",
    kind: "managed",
    status: "starting",
    cwd: "C:\\Apps\\matriz-infra-hub",
    tail: "building",
  },
]

describe("terminal view", () => {
  it("keeps all session actions keyboard reachable", () => {
    const create = vi.fn()
    const activate = vi.fn()
    const interrupt = vi.fn()
    const close = vi.fn()
    render(
      <TerminalView
        state={createTerminalState(sessions)}
        create={create}
        activate={activate}
        interrupt={interrupt}
        close={close}
        renderPane={() => <div>terminal output</div>}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Nova sessão PowerShell" }))
    fireEvent.click(screen.getByRole("tab", { name: /SEUMEI \/ BUILD/ }))
    fireEvent.click(screen.getByRole("button", { name: "Interromper PowerShell 7" }))
    fireEvent.click(screen.getByRole("button", { name: "Fechar PowerShell 7" }))

    expect(create).toHaveBeenCalledOnce()
    expect(activate).toHaveBeenCalledWith("build-b")
    expect(interrupt).toHaveBeenCalledWith("shell-a")
    expect(close).toHaveBeenCalledWith("shell-a")
  })

  it("announces active and busy status without relying on color", () => {
    render(
      <TerminalView
        state={createTerminalState(sessions)}
        create={vi.fn()}
        activate={vi.fn()}
        interrupt={vi.fn()}
        close={vi.fn()}
        renderPane={() => <div>terminal output</div>}
      />,
    )

    expect(screen.getByRole("tab", { name: /PowerShell 7.*executando/i })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    expect(screen.getByRole("tab", { name: /SEUMEI \/ BUILD.*iniciando/i })).toBeVisible()
  })
})
