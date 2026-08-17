import type { ReactNode } from "react"
import type { ProjectNavViewModel } from "../presenters/workspace-presenters"
import type { RailPreference, TopbarPreference } from "../shell-preferences"
import { lockAction } from "../../../app/actions"
import { CommandMenu } from "./command-menu"
import { ShellChrome, type ShellNavigationItem } from "./shell-chrome"
import { ThemeToggle } from "./theme-toggle"
import { ThemeSystemPicker } from "./theme-system-picker"

const primaryNavigation = [
  { href: "/", icon: "⌁", label: "Foco" },
  { href: "/control", icon: "◈", label: "Controle" },
  { activePrefixes: ["/work"], href: "/work/inbox", icon: "◎", label: "Trabalho" },
  { href: "/projects", icon: "⌘", label: "Projetos" },
  { href: "/knowledge", icon: "◇", label: "Conhecimento" },
  { href: "/sites", icon: "▦", label: "Sites" },
  { href: "/praticies", icon: "+", label: "Praticies" },
] satisfies readonly ShellNavigationItem[]

const secondaryNavigation = [
  { href: "/settings", icon: "⚙", label: "Configurações" },
] satisfies readonly ShellNavigationItem[]

export function AppShell({
  projects,
  initialRailPreference,
  initialTopbarPreference,
  children,
}: {
  projects: ProjectNavViewModel[]
  initialRailPreference: RailPreference
  initialTopbarPreference: TopbarPreference
  children: ReactNode
}) {
  const projectNavigation = projects.map((project) => ({
    href: `/projects/${project.id}`,
    icon: "",
    indicator: project.initialized ? "ready" as const : "idle" as const,
    label: project.displayName,
    warning: project.corrupted ? "Projeto com dados inválidos" : undefined,
  }))

  return (
    <ShellChrome
      initialRailPreference={initialRailPreference}
      initialTopbarPreference={initialTopbarPreference}
      lockAction={lockAction}
      primaryNavigation={primaryNavigation}
      projectNavigation={projectNavigation}
      secondaryNavigation={secondaryNavigation}
      topbar={
        <>
          <span className="live-dot" aria-hidden="true" />
          <span>Repositório local</span>
          <span className="topbar-path">.matriz · apps/*/.matriz</span>
          <ThemeSystemPicker />
          <ThemeToggle />
          <CommandMenu projects={projects} />
        </>
      }
    >
      {children}
    </ShellChrome>
  )
}
