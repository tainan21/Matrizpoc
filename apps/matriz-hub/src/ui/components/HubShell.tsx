"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { CommandSearch } from "../environment/CommandSearch"
import { GlobalContextBar } from "../environment/GlobalContextBar"
import { resolveActiveNavItem } from "../environment/navigation"
import { OperationalDock } from "../environment/OperationalDock"
import { OperationalNav } from "../environment/OperationalNav"

interface HubShellProps {
  readonly children: React.ReactNode
  readonly session: {
    readonly userName: string
    readonly email: string
  }
  readonly onSignOut: () => void
}

const NAV_STORAGE_KEY = "matriz-hub:alpha-nav-collapsed"

export function HubShell({ children, session, onSignOut }: HubShellProps) {
  const pathname = usePathname() ?? "/"
  const [navCollapsed, setNavCollapsed] = React.useState(false)
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const commandTriggerRef = React.useRef<HTMLButtonElement>(null)
  const currentArea = resolveActiveNavItem(pathname)?.label ?? "Área contextual"

  React.useEffect(() => {
    setNavCollapsed(window.localStorage.getItem(NAV_STORAGE_KEY) === "true")
  }, [])

  React.useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const editing = target?.matches("input, textarea, select, [contenteditable='true']")
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen(true)
      } else if (event.key === "/" && !editing) {
        event.preventDefault()
        setCommandOpen(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  React.useEffect(() => {
    if (!mobileNavOpen && !commandOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [commandOpen, mobileNavOpen])

  function toggleCollapsed() {
    setNavCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(NAV_STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <div
      className="hub-environment"
      data-mobile-nav-open={mobileNavOpen}
      data-nav-collapsed={navCollapsed}
    >
      <a className="hub-environment__skip" href="#hub-main-content">Pular para o conteúdo</a>
      <GlobalContextBar
        commandTriggerRef={commandTriggerRef}
        currentArea={currentArea}
        onOpenCommand={() => setCommandOpen(true)}
        onSignOut={onSignOut}
        onToggleNavigation={() => setMobileNavOpen((current) => !current)}
        session={session}
      />
      <OperationalNav
        collapsed={navCollapsed}
        onNavigate={() => setMobileNavOpen(false)}
        onToggleCollapsed={toggleCollapsed}
        pathname={pathname}
      />
      <button
        aria-label="Fechar navegação"
        className="hub-mobile-scrim"
        onClick={() => setMobileNavOpen(false)}
        type="button"
      />
      <main className="hub-environment__workspace" id="hub-main-content" tabIndex={-1}>
        <div className="hub-environment__content">{children}</div>
      </main>
      <OperationalDock />
      <CommandSearch
        onClose={() => setCommandOpen(false)}
        open={commandOpen}
        returnFocusRef={commandTriggerRef}
      />
    </div>
  )
}
