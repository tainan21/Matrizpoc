"use client"

import Link from "next/link"
import type { KeyboardEvent } from "react"
import type { ShellAppViewModel } from "./shell.types"

export function AppSwitcher({ apps, onClose }: { readonly apps: readonly ShellAppViewModel[]; readonly onClose: () => void }) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose() }
  }
  return (
    <div className="seumei-app-switcher" role="dialog" aria-label="Aplicativos Seumei" tabIndex={-1} onKeyDown={handleKeyDown}>
      <div className="seumei-app-switcher__heading"><div><strong>Aplicativos</strong><span>Capacidades desta empresa</span></div><button type="button" onClick={onClose} aria-label="Fechar aplicativos">×</button></div>
      <div className="seumei-app-switcher__grid">
        {apps.map((app) => <Link key={app.id} href={app.href ?? "#"} onClick={onClose}><span aria-hidden="true">{shellIcon(app.icon)}</span><strong>{app.name}</strong></Link>)}
      </div>
    </div>
  )
}

export function shellIcon(icon: string) {
  return ({ dashboard: "⌂", users: "◎", package: "◇", receipt: "▤", boxes: "▦", wallet: "$", store: "▱", chart: "⌁" } as Record<string, string>)[icon] ?? "✦"
}
