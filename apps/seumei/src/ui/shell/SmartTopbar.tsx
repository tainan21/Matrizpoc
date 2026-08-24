"use client"

import type { KeyboardEvent, RefObject } from "react"
import { ThemeToggle } from "@matriz/design-ui"
import type { ShellCompanyViewModel, ShellUserViewModel } from "./shell.types"

export function SmartTopbar({ company, user, appSwitcherOpen, onToggleApps, onToggleNavigation, appTriggerRef }: { readonly company: ShellCompanyViewModel | null; readonly user: ShellUserViewModel; readonly appSwitcherOpen: boolean; readonly onToggleApps: () => void; readonly onToggleNavigation: () => void; readonly appTriggerRef: RefObject<HTMLButtonElement | null> }) {
  function handleAppKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onToggleApps() }
  }
  return (
    <header className="seumei-smart-topbar">
      <a className="seumei-wordmark" href="/hub" aria-label="Seumei Hub"><span aria-hidden="true">✣</span><strong>seumei</strong></a>
      <div className="seumei-topbar-tools">
        <button type="button" className="seumei-navigation-trigger" aria-label="Abrir menu principal" onClick={onToggleNavigation}><span aria-hidden="true">☰</span></button>
        <button ref={appTriggerRef} type="button" className="seumei-app-trigger" aria-label="Aplicativos Seumei" aria-expanded={appSwitcherOpen} onClick={onToggleApps} onKeyDown={handleAppKeyDown}><span aria-hidden="true">▦</span><span className="seumei-control-label">Apps</span></button>
        <label className="seumei-global-search"><span aria-hidden="true">⌕</span><input aria-label="Busca global" placeholder="Buscar empresas, apps, menus…" /><kbd>⌘ K</kbd></label>
        <button type="button" className="seumei-topbar-icon" aria-label="Notificações">♢<i /></button>
        <ThemeToggle appId="seumei" />
        <button type="button" className="seumei-account-button" onClick={user.onSignOut}><span>{user.name.slice(0, 1).toUpperCase()}</span><span className="seumei-account-copy"><strong>{user.name}</strong><small>{company?.name ?? user.role}</small></span></button>
      </div>
    </header>
  )
}
