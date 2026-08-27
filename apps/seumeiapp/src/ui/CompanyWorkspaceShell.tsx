import Link from "next/link"
import type { ReactNode } from "react"
import type { WorkspaceShellViewModel } from "./presenters/workspace-shell.presenter"
import { WorkspaceCommandPalette } from "./WorkspaceCommandPalette"

export function CompanyWorkspaceShell({
  shell,
  children,
}: {
  readonly shell: WorkspaceShellViewModel
  readonly children: ReactNode
}) {
  return (
    <div className="company-shell">
      <aside className="company-rail">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark">S</span><strong>SEUMEI</strong>
        </Link>
        <div className="company-rail-context">
          <span className="eyebrow">EMPRESA ATIVA</span>
          <strong>{shell.companyName}</strong>
          <span>{shell.roleLabel}</span>
        </div>
        <nav aria-label="Workspace">
          {shell.navigation.map((item, index) => (
            <Link key={item.href} href={item.href}>
              <span aria-hidden="true">0{index + 1}</span>{item.label}
            </Link>
          ))}
        </nav>
        <WorkspaceCommandPalette commands={shell.navigation} />
        <Link href="/" className="company-switch">Trocar empresa</Link>
      </aside>
      <div className="company-surface">{children}</div>
    </div>
  )
}
