import { useEffect, useRef } from "react"
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react"

import { TerminalView } from "./terminal-view"
import type { TerminalViewProps } from "./terminal-view"

const MIN_DOCK_HEIGHT = 180
const MAX_DOCK_HEIGHT = 520
const KEYBOARD_RESIZE_STEP = 24

export function clampTerminalDockHeight(height: number): number {
  return Math.round(Math.min(MAX_DOCK_HEIGHT, Math.max(MIN_DOCK_HEIGHT, height)))
}

interface TerminalDockProps extends TerminalViewProps {
  readonly open: boolean
  readonly height: number
  readonly setOpen: (open: boolean) => void
  readonly resize: (height: number) => void
  readonly commitResize: (height: number) => void
}

interface DragState {
  readonly startY: number
  readonly startHeight: number
  currentHeight: number
}

export function TerminalDock({
  open,
  height,
  setOpen,
  resize,
  commitResize,
  state,
  ...terminalProps
}: TerminalDockProps) {
  const drag = useRef<DragState | undefined>(undefined)

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!drag.current) return
      const next = clampTerminalDockHeight(
        drag.current.startHeight + drag.current.startY - event.clientY,
      )
      drag.current.currentHeight = next
      resize(next)
    }
    const finish = () => {
      if (!drag.current) return
      const next = drag.current.currentHeight
      drag.current = undefined
      commitResize(next)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", finish)
    window.addEventListener("pointercancel", finish)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", finish)
      window.removeEventListener("pointercancel", finish)
    }
  }, [commitResize, resize])

  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    drag.current = { startY: event.clientY, startHeight: height, currentHeight: height }
  }

  const resizeWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number | undefined
    if (event.key === "ArrowUp") next = height + KEYBOARD_RESIZE_STEP
    if (event.key === "ArrowDown") next = height - KEYBOARD_RESIZE_STEP
    if (event.key === "Home") next = MIN_DOCK_HEIGHT
    if (event.key === "End") next = MAX_DOCK_HEIGHT
    if (next === undefined) return
    event.preventDefault()
    const clamped = clampTerminalDockHeight(next)
    resize(clamped)
    commitResize(clamped)
  }

  const active = state.sessions.find(({ id }) => id === state.activeId)
  const status = state.sessions.some(({ status: value }) => value === "failed")
    ? "failed"
    : state.sessions.length
      ? "running"
      : "exited"

  return (
    <aside
      className={`terminal-dock${open ? " is-open" : ""}`}
      style={open ? { height: `${clampTerminalDockHeight(height)}px` } : undefined}
      aria-label="Terminal inferior"
    >
      {open ? (
        <>
          <div
            className="terminal-dock-resizer"
            role="separator"
            aria-label="Redimensionar terminal inferior"
            aria-orientation="horizontal"
            aria-valuemin={MIN_DOCK_HEIGHT}
            aria-valuemax={MAX_DOCK_HEIGHT}
            aria-valuenow={clampTerminalDockHeight(height)}
            tabIndex={0}
            onPointerDown={beginResize}
            onKeyDown={resizeWithKeyboard}
          />
          <button
            type="button"
            className="terminal-dock-toggle"
            aria-label="Recolher terminal inferior"
            onClick={() => setOpen(false)}
          >
            TERMINAL ↓
          </button>
          <TerminalView compact state={state} {...terminalProps} />
        </>
      ) : (
        <button
          type="button"
          className="terminal-dock-summary"
          aria-label="Abrir terminal inferior"
          onClick={() => setOpen(true)}
        >
          <span className={`terminal-state terminal-state--${status}`} aria-hidden="true" />
          <strong>TERMINAL</strong>
          <span>{state.sessions.length.toString().padStart(2, "0")}</span>
          <small>{active?.title ?? "Nenhuma sessão ativa"}</small>
          <b aria-hidden="true">↑</b>
        </button>
      )}
    </aside>
  )
}
