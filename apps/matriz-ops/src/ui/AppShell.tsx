import Link from "next/link"
import { manifest } from "../manifest/manifest"

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="ops-shell">
    <aside className="ops-sidebar">
      <div className="ops-brand"><img className="ops-mark" src="/matriz-logo.svg" alt="Matriz"/><div><strong>Matriz Ops</strong><small>Control center</small></div></div>
      <nav>{manifest.routes.map((route) => <Link key={route.path} href={route.path}>{route.label}</Link>)}</nav>
      <div className="ops-sidebar-foot"><span className="status-dot" /> Ambiente local</div>
    </aside>
    <main className="ops-main"><header><div><small>OPERAÇÃO INTERNA</small><h1>Centro de controle</h1></div><a href="http://127.0.0.1:3000">Abrir Hub ↗</a></header>{children}</main>
  </div>
}
