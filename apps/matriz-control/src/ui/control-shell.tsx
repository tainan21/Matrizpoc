"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type ReactNode } from "react"
import { TerminalDock } from "./terminal/terminal-dock"
import { TerminalProvider, useTerminal } from "./terminal/terminal-context"
import { InstalledAppsProvider, useInstalledApps } from "./apps/installed-apps-context"
import { ExternalAppStage } from "./apps/external-app-stage"
import { SmartAppRail } from "./apps/smart-app-rail"
import styles from "./apps/app-host.module.css"
import { UpdateCenter } from "./updates/update-center"
import { ProjectHostProvider } from "./projects/project-host-context"

const links = [["/home", "Início"], ["/apps", "Apps"], ["/workspace", "Workspace"], ["/git", "Git"], ["/terminal", "Terminal"], ["/browser", "Navegador"], ["/actions", "Ações"], ["/store", "Store"], ["/doctor", "Doctor"], ["/settings", "Ajustes"]] as const

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const terminal = useTerminal()
  const { apps, state, activate, navigation } = useInstalledApps()
  const [activeAppPath, setActiveAppPath] = useState("")
  const activeApp = apps.find((app) => app.appId === state.activeAppId) ?? null
  return <div className={`control-root ${styles.root} dock-${terminal.open ? terminal.placement : "closed"}`} data-active-app={activeApp?.appId === "health" ? "health" : undefined}>
    <header className="brand-bar"><Link href="/home"><b>M</b><span>MATRIZ / CONTROL</span></Link><div><span className="global-score">34</span><UpdateCenter /></div></header>
    <nav className="main-nav" aria-label="Navegação principal">{links.map(([href, label]) => <Link className={pathname.startsWith(href) ? "active" : ""} href={href} key={href}>{label}</Link>)}</nav>
    <SmartAppRail apps={apps} navigation={navigation} activeAppId={state.activeAppId} onActivate={(appId) => { setActiveAppPath(""); activate(appId) }} onOpenPath={(appId, path) => { setActiveAppPath(path); activate(appId) }} />
    <div className="control-content">{activeApp ? <ExternalAppStage app={activeApp} path={activeApp.appId === "health" ? activeAppPath : ""} openSession={(projectId, signal) => terminal.openSession(projectId, "dev", signal)} onOpenTerminal={() => terminal.setOpen(true)} /> : children}</div>
    <TerminalDock />
  </div>
}

export function ControlShell({ children }: { children: ReactNode }) { return <InstalledAppsProvider><ProjectHostProvider><TerminalProvider><Shell>{children}</Shell></TerminalProvider></ProjectHostProvider></InstalledAppsProvider> }
