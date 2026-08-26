"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { TerminalDock } from "./terminal/terminal-dock"
import { TerminalProvider, useTerminal } from "./terminal/terminal-context"
import { InstalledAppsProvider, useInstalledApps } from "./apps/installed-apps-context"
import { ExternalAppStage } from "./apps/external-app-stage"
import { SmartAppRail } from "./apps/smart-app-rail"
import styles from "./apps/app-host.module.css"

const links = [["/apps", "Apps"], ["/workspace", "Workspace"], ["/terminal", "Terminal"], ["/browser", "Navegador"], ["/actions", "Ações"], ["/store", "Store"], ["/doctor", "Doctor"], ["/settings", "Ajustes"]] as const

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const terminal = useTerminal()
  const { apps, state, activate } = useInstalledApps()
  const activeApp = apps.find((app) => app.appId === state.activeAppId) ?? null
  return <div className={`control-root ${styles.root} dock-${terminal.open ? terminal.placement : "closed"}`} data-active-app={activeApp?.appId === "health" ? "health" : undefined}>
    <header className="brand-bar"><Link href="/apps"><b>M</b><span>MATRIZ / CONTROL</span></Link><div><span className="global-score">34</span><button aria-label="Atualizar">↻</button></div></header>
    <nav className="main-nav" aria-label="Navegação principal">{links.map(([href, label]) => <Link className={pathname.startsWith(href) ? "active" : ""} href={href} key={href}>{label}</Link>)}</nav>
    <SmartAppRail apps={apps} activeAppId={state.activeAppId} onActivate={activate} />
    <div className="control-content">{activeApp ? <ExternalAppStage app={activeApp} openSession={terminal.openSession} onOpenTerminal={() => terminal.setOpen(true)} /> : children}</div>
    <TerminalDock />
  </div>
}

export function ControlShell({ children }: { children: ReactNode }) { return <InstalledAppsProvider><TerminalProvider><Shell>{children}</Shell></TerminalProvider></InstalledAppsProvider> }
