# Shared UI Components

## AppShell

- Path: `apps/matriz-ops/src/ui/AppShell.tsx`
- Purpose: persistent navigation/sidebar and operational header shared by every authenticated Ops page.

```tsx
import Link from "next/link"
import { manifest } from "../manifest/manifest"

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="ops-shell">
    <aside className="ops-sidebar">
      <div className="ops-brand"><span className="ops-mark">M</span><div><strong>Matriz Ops</strong><small>Control center</small></div></div>
      <nav>{manifest.routes.map((route) => <Link key={route.path} href={route.path}>{route.label}</Link>)}</nav>
      <div className="ops-sidebar-foot"><span className="status-dot" /> Ambiente local</div>
    </aside>
    <main className="ops-main"><header><div><small>OPERAÇÃO INTERNA</small><h1>Centro de controle</h1></div><a href="http://127.0.0.1:3000">Abrir Hub ↗</a></header>{children}</main>
  </div>
}
```

## Current visual primitives

The Ops app currently uses app-local semantic CSS classes: `hero`, `metric-grid`, `metric`, `panel`, `data-table`, `pill`, `access-card`, and `status-dot`. The redesign should formalize these into reusable Ops-local React components; they are not candidates for a shared package because only Ops consumes them.
