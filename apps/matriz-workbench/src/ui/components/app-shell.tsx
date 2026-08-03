import Link from "next/link"
import type { ReactNode } from "react"
import type { ProjectNavViewModel } from "../presenters/workspace-presenters"
import { lockAction } from "../../../app/actions"
import { CommandMenu } from "./command-menu"
import { ThemeToggle } from "./theme-toggle"
import { ThemeSystemPicker } from "./theme-system-picker"

export function AppShell({
  projects,
  children,
}: {
  projects: ProjectNavViewModel[]
  children: ReactNode
}) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace-content">Pular para o conteúdo</a>
      <aside className="project-rail">
        <div className="rail-brand">
          <span className="brand-mark small">M</span>
          <span>
            <strong>Workbench</strong>
            <small>matriz local</small>
          </span>
        </div>
        <nav className="primary-nav" aria-label="Navegação principal">
          <Link href="/"><span className="rail-icon" aria-hidden="true">⌁</span><span>Foco</span></Link>
          <Link href="/control"><span className="rail-icon" aria-hidden="true">◈</span><span>Controle</span></Link>
          <Link href="/work/inbox"><span className="rail-icon" aria-hidden="true">◎</span><span>Trabalho</span></Link>
          <Link href="/projects"><span className="rail-icon" aria-hidden="true">⌘</span><span>Projetos</span></Link>
          <Link href="/knowledge"><span className="rail-icon" aria-hidden="true">◇</span><span>Conhecimento</span></Link>
          <Link href="/sites"><span className="rail-icon" aria-hidden="true">▦</span><span>Sites</span></Link>
        </nav>
        <div className="rail-section-title">Apps detectados <span>{projects.length}</span></div>
        <nav className="project-nav" aria-label="Projetos">
          {projects.map((project) => (
            <Link href={`/projects/${project.id}`} key={project.id} title={project.displayName}>
              <span className={`project-dot ${project.initialized ? "ready" : ""}`} />
              <span className="truncate">{project.displayName}</span>
              {project.corrupted ? <span className="danger">!</span> : null}
            </Link>
          ))}
        </nav>
        <div className="rail-footer">
          <Link href="/settings"><span className="rail-icon" aria-hidden="true">⚙</span><span>Configurações</span></Link>
          <form action={lockAction}><button type="submit"><span className="rail-icon" aria-hidden="true">↗</span><span>Bloquear</span></button></form>
        </div>
      </aside>
      <div className="workspace-frame">
        <header className="topbar">
          <span className="live-dot" aria-hidden="true" />
          <span>Repositório local</span>
          <span className="topbar-path">.matriz · apps/*/.matriz</span>
          <ThemeSystemPicker />
          <ThemeToggle />
          <CommandMenu projects={projects} />
        </header>
        <div id="workspace-content" tabIndex={-1}>{children}</div>
      </div>
    </div>
  )
}
