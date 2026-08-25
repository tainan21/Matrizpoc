"use client"

import * as React from "react"
import { AppSwitcher } from "./AppSwitcher"
import { ContextSidebar } from "./ContextSidebar"
import { SmartTopbar } from "./SmartTopbar"
import type { SeumeiShellProps } from "./shell.types"

export function SeumeiShell(props: SeumeiShellProps) {
  const [sidebarExpanded, setSidebarExpanded] = React.useState(false)
  const [appSwitcherOpen, setAppSwitcherOpen] = React.useState(false)
  const appTriggerRef = React.useRef<HTMLButtonElement>(null)
  function closeAppSwitcher() { setAppSwitcherOpen(false); appTriggerRef.current?.focus() }
  return (
    <div className="seumei-shell" style={{ "--active-company-accent": props.company?.accent ?? "#8b5cf6" } as React.CSSProperties}>
      <SmartTopbar company={props.company} user={props.user} appSwitcherOpen={appSwitcherOpen} onToggleApps={() => setAppSwitcherOpen((open) => !open)} onToggleNavigation={() => setSidebarExpanded((expanded) => !expanded)} appTriggerRef={appTriggerRef} />
      {appSwitcherOpen ? <AppSwitcher apps={props.apps} onClose={closeAppSwitcher} /> : null}
      <ContextSidebar company={props.company} activeApp={props.activeApp} navigation={props.navigation} expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((expanded) => !expanded)} />
      <main className="seumei-shell-content">{props.children}</main>
    </div>
  )
}
