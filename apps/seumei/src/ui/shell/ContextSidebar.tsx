"use client"

import Link from "next/link"
import type { ShellAppViewModel, ShellCompanyViewModel, ShellNavigationItem } from "./shell.types"
import { shellIcon } from "./AppSwitcher"

export function ContextSidebar({ company, activeApp, navigation, expanded, onToggle }: { readonly company: ShellCompanyViewModel | null; readonly activeApp: ShellAppViewModel | null; readonly navigation: readonly ShellNavigationItem[]; readonly expanded: boolean; readonly onToggle: () => void }) {
  return (
    <aside className="seumei-context-sidebar" data-expanded={expanded}>
      <div className="seumei-sidebar-company">{company ? <img src={company.logoUrl} alt="" /> : <span aria-hidden="true">✦</span>}<div><strong>{company?.name ?? "Seumei"}</strong><small>{activeApp?.name ?? "Business OS"}</small></div></div>
      <nav aria-label="Aplicação atual" data-expanded={String(expanded)}>
        <Link href="/hub" className={!activeApp ? "is-active" : ""}><span aria-hidden="true">⌂</span><span>Hub</span></Link>
        {navigation.map((item, index) => <Link key={item.id} href={item.href} className={index === 0 && activeApp ? "is-active" : ""}><span aria-hidden="true">{index === 0 && activeApp ? shellIcon(activeApp.icon) : "·"}</span><span>{item.label}</span></Link>)}
      </nav>
      <div className="seumei-sidebar-footer"><a href="http://localhost:3000"><span aria-hidden="true">↗</span><span>Ecossistema Matriz</span></a><button type="button" onClick={onToggle} aria-label={expanded ? "Recolher navegação" : "Expandir navegação"}><span aria-hidden="true">{expanded ? "‹" : "›"}</span><span>{expanded ? "Recolher menu" : "Expandir menu"}</span></button></div>
    </aside>
  )
}
