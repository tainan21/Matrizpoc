import "@xterm/xterm/css/xterm.css"

import { useEffect, useRef } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { TerminalSession } from "../../domain/types"

export function TerminalPane({
  session,
  gateway,
  register,
  reportError,
}: {
  readonly session: TerminalSession
  readonly gateway: DesktopGateway
  readonly register: (session: TerminalSession, sink: (data: string) => void) => () => void
  readonly reportError: (cause: unknown) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const initialSession = useRef(session).current

  useEffect(() => {
    if (!host.current) return
    const element = host.current
    let disposed = false
    let disposeRuntime = () => undefined
    let frame = 0

    void Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]).then(
      ([{ Terminal }, { FitAddon }]) => {
        if (disposed) return
        const fit = new FitAddon()
        const terminal = new Terminal({
          allowTransparency: true,
          cursorBlink: true,
          cursorStyle: "bar",
          fontFamily: '\"Cascadia Mono\", \"JetBrains Mono\", Consolas, monospace',
          fontSize: 13,
          minimumContrastRatio: 7,
          screenReaderMode: true,
          scrollback: 1_000,
          theme: {
            background: "#09070d",
            foreground: "#eeeaf3",
            cursor: "#b996ff",
            selectionBackground: "#6944a966",
            black: "#19141f",
            brightBlack: "#756d7f",
            magenta: "#a779ff",
            brightMagenta: "#c9adff",
          },
        })
        terminal.loadAddon(fit)
        terminal.open(element)
        const unregister = register(initialSession, (data) => terminal.write(data))
        const input = terminal.onData((data) => {
          void gateway.writeTerminal(initialSession.id, data).catch(reportError)
        })
        const resize = new ResizeObserver(() => {
          cancelAnimationFrame(frame)
          frame = requestAnimationFrame(() => {
            try {
              fit.fit()
              void gateway.resizeTerminal(initialSession.id, terminal.cols, terminal.rows).catch(reportError)
            } catch (cause) {
              reportError(cause)
            }
          })
        })
        resize.observe(element)
        fit.fit()
        terminal.focus()
        disposeRuntime = () => {
          resize.disconnect()
          input.dispose()
          unregister()
          terminal.dispose()
        }
      },
    ).catch(reportError)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      disposeRuntime()
    }
  }, [gateway, initialSession, register, reportError])

  return <div className="xterm-host" ref={host} aria-label={`Saída de ${session.title}`} />
}
