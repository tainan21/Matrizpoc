import "@testing-library/jest-dom/vitest"

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { createTerminalState } from "./terminal-store"
import { TerminalDock, clampTerminalDockHeight } from "./terminal-dock"

describe("terminal dock", () => {
  it("keeps resize values inside the safe vertical range", () => {
    expect(clampTerminalDockHeight(100)).toBe(180)
    expect(clampTerminalDockHeight(340)).toBe(340)
    expect(clampTerminalDockHeight(900)).toBe(520)
  })

  it("opens without creating a session and commits keyboard resizing", () => {
    const create = vi.fn()
    const setOpen = vi.fn()
    const resize = vi.fn()
    const commitResize = vi.fn()
    const { rerender } = render(
      <TerminalDock
        open={false}
        height={280}
        state={createTerminalState()}
        setOpen={setOpen}
        resize={resize}
        commitResize={commitResize}
        create={create}
        activate={vi.fn()}
        interrupt={vi.fn()}
        close={vi.fn()}
        renderPane={() => null}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Abrir terminal inferior" }))
    expect(setOpen).toHaveBeenCalledWith(true)
    expect(create).not.toHaveBeenCalled()

    rerender(
      <TerminalDock
        open
        height={280}
        state={createTerminalState()}
        setOpen={setOpen}
        resize={resize}
        commitResize={commitResize}
        create={create}
        activate={vi.fn()}
        interrupt={vi.fn()}
        close={vi.fn()}
        renderPane={() => null}
      />,
    )
    fireEvent.keyDown(screen.getByRole("separator", { name: "Redimensionar terminal inferior" }), { key: "ArrowUp" })

    expect(resize).toHaveBeenCalledWith(304)
    expect(commitResize).toHaveBeenCalledWith(304)
    expect(create).not.toHaveBeenCalled()
  })
})
