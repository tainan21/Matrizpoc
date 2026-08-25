# Matriz Control shared layouts

## `apps/matriz-control/app/layout.tsx`

Next.js root layout. It loads the global theme and wraps every authenticated route in `ControlShell`.

```tsx
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ControlShell } from "../src/ui/control-shell"
import "./globals.css"

export const metadata: Metadata = { title: "Matriz Control", description: "Cockpit operacional local do ecossistema Matriz" }
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="pt-BR"><body><ControlShell>{children}</ControlShell></body></html> }
```

## `apps/matriz-control/src/ui/control-shell.tsx`

Persistent brand bar, primary module navigation, content viewport, and global terminal dock.

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { TerminalDock } from "./terminal/terminal-dock"
import { TerminalProvider, useTerminal } from "./terminal/terminal-context"

const links = [["/apps", "Apps"], ["/workspace", "Workspace"], ["/terminal", "Terminal"], ["/actions", "Ações"], ["/store", "Store"], ["/doctor", "Doctor"], ["/settings", "Ajustes"]] as const

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const terminal = useTerminal()
  return <div className={`control-root dock-${terminal.open ? terminal.placement : "closed"}`}>
    <header className="brand-bar"><Link href="/apps"><b>M</b><span>MATRIZ / CONTROL</span></Link><div><span className="global-score">34</span><button aria-label="Atualizar">↻</button></div></header>
    <nav className="main-nav" aria-label="Navegação principal">{links.map(([href, label]) => <Link className={pathname.startsWith(href) ? "active" : ""} href={href} key={href}>{label}</Link>)}</nav>
    <div className="control-content">{children}</div>
    <TerminalDock />
  </div>
}

export function ControlShell({ children }: { children: ReactNode }) { return <TerminalProvider><Shell>{children}</Shell></TerminalProvider> }
```

## `apps/matriz-control/src/ui/terminal/terminal-dock.tsx`

Persistent bottom/right operational dock. It must remain usable while the browser module is open.

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { useTerminal } from "./terminal-context"

export function TerminalDock() {
  const terminal = useTerminal()
  const [input, setInput] = useState("")
  const outputRef = useRef<HTMLPreElement>(null)
  useEffect(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight }, [terminal.activeSession?.lines])
  if (!terminal.open) return <button className="terminal-peek" type="button" onClick={() => terminal.setOpen(true)}><span>›_</span> Terminal <kbd>Ctrl J</kbd></button>
  const session = terminal.activeSession
  const style = terminal.placement === "bottom" ? { height: terminal.bottomSize } : { width: terminal.rightSize }
  return <aside className={`terminal-dock terminal-${terminal.placement}`} style={style} aria-label="Terminal global">
    <div className="terminal-resize" role="separator" aria-orientation={terminal.placement === "bottom" ? "horizontal" : "vertical"} tabIndex={0} onKeyDown={(event) => { if (["ArrowUp", "ArrowLeft"].includes(event.key)) terminal.resize(24); if (["ArrowDown", "ArrowRight"].includes(event.key)) terminal.resize(-24) }} />
    <header className="terminal-toolbar">
      <div className="terminal-tabs">{terminal.sessions.map((item) => <button className={session?.id === item.id ? "active" : ""} key={item.id} onClick={() => terminal.setActiveSessionId(item.id)}><i className={`status-dot ${item.status}`} />{item.projectName}<small>{item.actionId}</small></button>)}</div>
      <div className="terminal-tools"><button title="Mover terminal" onClick={() => terminal.setPlacement(terminal.placement === "bottom" ? "right" : "bottom")}>{terminal.placement === "bottom" ? "Dock right" : "Dock bottom"}</button><button title="Ocultar terminal" onClick={() => terminal.setOpen(false)}>Hide</button></div>
    </header>
    {session ? <><div className="terminal-meta"><span>{session.projectName} / {session.actionId}</span><span>{session.status}{session.pid ? ` · PID ${session.pid}` : ""}{session.exitCode !== null ? ` · exit ${session.exitCode}` : ""}</span><span className="terminal-actions">{["running", "starting"].includes(session.status) ? <button onClick={() => void terminal.stop(session.id)}>Stop</button> : <button onClick={() => void terminal.restart(session.id)}>Restart</button>} {!(["running", "starting", "stopping"] as string[]).includes(session.status) ? <button onClick={() => void terminal.close(session.id)}>Close</button> : null}</span></div><pre ref={outputRef} className="terminal-output" tabIndex={0}>{session.lines.length ? session.lines.join("\n") : "Starting process…"}</pre><form className="terminal-input" onSubmit={(event) => { event.preventDefault(); if (!input) return; void terminal.sendInput(session.id, `${input}\n`); setInput("") }}><span>$</span><input aria-label="Enviar entrada ao terminal" value={input} onChange={(event) => setInput(event.target.value)} autoComplete="off" /><button>Send</button></form></> : <div className="terminal-empty"><strong>›_</strong><h2>Nenhuma sessão aberta</h2><p>Inicie um app ou abra uma sessão na página Terminal.</p></div>}
  </aside>
}
```
