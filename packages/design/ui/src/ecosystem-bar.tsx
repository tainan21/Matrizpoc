"use client"

import { useState } from "react"

export interface EcosystemAppLink {
  readonly id: string
  readonly label: string
  readonly href: string
}

export interface EcosystemBarProps {
  readonly currentAppId: string
  readonly apps: readonly EcosystemAppLink[]
  readonly themeControl?: React.ReactNode
  readonly cacheControl?: React.ReactNode
}

export const ECOSYSTEM_PANEL_STYLE = {
  width: 280,
  marginBottom: 8,
  padding: 12,
  border: "1px solid var(--color-border, var(--border, #d4d4d8))",
  borderRadius: 12,
  background: "var(--color-surface, var(--surface, #fff))",
  color: "var(--color-foreground, var(--surface-fg, var(--text, #111827)))",
  boxShadow: "0 18px 48px rgba(0,0,0,.18)",
} as const

export function EcosystemBar({ currentAppId, apps, themeControl, cacheControl }: EcosystemBarProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="matriz-ecosystem-root" style={{ position: "fixed", right: 16, bottom: 16, zIndex: 9999, fontFamily: "var(--font-sans, system-ui), sans-serif" }}>
      {open ? (
        <div role="dialog" aria-label="Alternar plataforma" style={ECOSYSTEM_PANEL_STYLE}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>Ecossistema Matriz</strong>
            {themeControl}
          </div>
          <nav style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {apps.map((app) => <a key={app.id} href={app.href} aria-current={app.id === currentAppId ? "page" : undefined} style={{ padding: "8px 9px", borderRadius: 7, color: "inherit", textDecoration: "none", fontSize: 12, border: "1px solid var(--color-border, var(--border, #ddd))", opacity: app.id === currentAppId ? .55 : 1 }}>{app.label}</a>)}
          </nav>
          {cacheControl ? <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--color-border, var(--border, #ddd))" }}>{cacheControl}</div> : null}
        </div>
      ) : null}
      <button className="matriz-ecosystem-trigger" type="button" aria-expanded={open} aria-label="Abrir alternador de plataformas" onClick={() => setOpen((value) => !value)} style={{ minWidth: 48, height: 48, padding: "0 15px", border: 0, borderRadius: 999, background: "#111827", color: "#fff", fontWeight: 700, cursor: "pointer", boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>
        {open ? "Fechar" : "M"}
      </button>
    </div>
  )
}
