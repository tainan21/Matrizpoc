import Link from "next/link"
import { Icon, type IconName } from "./icons"

const items: readonly { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Visão geral", icon: "dashboard" },
  { href: "/systems", label: "Sistemas", icon: "systems" },
  { href: "/site", label: "Site", icon: "site" },
  { href: "/payments", label: "Pagamentos", icon: "payments" },
  { href: "/integrations", label: "Integrações", icon: "integrations" },
]

export function AppShell({ productName, activePath, children }: { productName: string; activePath: string; children: React.ReactNode }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark"><span aria-hidden="true">M</span><strong>{productName}</strong></div>
      <nav aria-label="Principal">{items.map((item) => <Link key={item.href} href={item.href} className={activePath === item.href ? "nav-link active" : "nav-link"} aria-label={item.label}><Icon name={item.icon}/><span>{item.label}</span></Link>)}</nav>
      <div className="sidebar-footer"><span className="status-dot"/>Experimento Matriz</div>
    </aside>
    <main className="workspace">{children}</main>
  </div>
}
