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
