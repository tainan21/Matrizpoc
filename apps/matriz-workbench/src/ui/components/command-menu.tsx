"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import type { ProjectNavViewModel } from "../presenters/workspace-presenters"

interface CommandDestination {
  href: string
  label: string
  context: string
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false
  const element = target as { tagName?: unknown; isContentEditable?: boolean }
  const tagName = typeof element.tagName === "string" ? element.tagName.toLowerCase() : ""
  return ["input", "textarea", "select"].includes(tagName) || element.isContentEditable === true
}

export function CommandMenu({ projects }: { projects: ProjectNavViewModel[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const sequenceRef = useRef<string[]>([])
  const destinations = useMemo<CommandDestination[]>(
    () => [
      { href: "/", label: "Foco atual", context: "Visão operacional" },
      { href: "/control", label: "Controle", context: "Score, evidências e aprovações" },
      { href: "/work/inbox", label: "Inbox de trabalho", context: "Captura e curadoria" },
      { href: "/work/backlog", label: "Backlog estruturado", context: "Trabalho multi-projeto" },
      { href: "/work/sprints", label: "Sprints", context: "Compromisso, review e validação" },
      { href: "/projects", label: "Projetos", context: "Apps detectados" },
      { href: "/projects/new", label: "Novo projeto", context: "Project Blueprint" },
      { href: "/knowledge", label: "Conhecimento", context: "Repositórios federados" },
      { href: "/sites", label: "Sites", context: "Catálogo e metadata" },
      {
        href: "/projects/matriz-workbench/docs/technical/agent-handbook",
        label: "Manual operacional para agentes",
        context: "Coworking, score e contratos",
      },
      { href: "/settings", label: "Configurações", context: "Saúde local" },
      ...projects.map((project) => ({
        href: `/projects/${project.id}`,
        label: project.displayName,
        context: project.initialized ? "Workspace ativo" : "Projeto detectado",
      })),
    ],
    [projects],
  )
  const normalized = query.trim().toLocaleLowerCase("pt-BR")
  const filtered = normalized
    ? destinations.filter((item) =>
        `${item.label} ${item.context}`.toLocaleLowerCase("pt-BR").includes(normalized),
      )
    : destinations

  useEffect(() => {
    function onGlobalKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => !current)
        return
      }
      if (isEditableShortcutTarget(event.target)) {
        sequenceRef.current = []
        return
      }
      if (event.key.toLowerCase() === "g") {
        sequenceRef.current = ["g"]
        window.setTimeout(() => { sequenceRef.current = [] }, 1200)
        return
      }
      if (sequenceRef.current[0] === "g") {
        const routes: Record<string, string> = { f: "/", c: "/control", b: "/work/backlog", i: "/work/inbox", s: "/work/sprints" }
        const destination = routes[event.key.toLowerCase()]
        sequenceRef.current = []
        if (destination) { event.preventDefault(); router.push(destination) }
      }
    }
    document.addEventListener("keydown", onGlobalKeyDown)
    return () => document.removeEventListener("keydown", onGlobalKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    setQuery("")
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  function onDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (event.key === "Enter" && filtered[0]) {
      event.preventDefault()
      setOpen(false)
      router.push(filtered[0].href)
      return
    }
    if (event.key !== "Tab") return
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, input, a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? [])]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="command-trigger"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span>Buscar</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open ? (
        <div className="command-overlay" role="presentation" onMouseDown={() => setOpen(false)}>
          <div
            aria-describedby="command-description"
            aria-labelledby="command-title"
            aria-modal="true"
            className="command-dialog"
            onKeyDown={onDialogKeyDown}
            onMouseDown={(event) => event.stopPropagation()}
            ref={dialogRef}
            role="dialog"
          >
            <div className="command-dialog-header">
              <div>
                <strong id="command-title">Ir para</strong>
                <span id="command-description">Busque projetos e áreas do Workbench.</span>
              </div>
              <button aria-label="Fechar busca" onClick={() => setOpen(false)} type="button">Esc</button>
            </div>
            <label className="sr-only" htmlFor="command-search">Buscar destino</label>
            <input
              autoComplete="off"
              id="command-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Digite um projeto ou área…"
              ref={inputRef}
              role="searchbox"
              value={query}
            />
            <nav aria-label="Resultados da busca">
              {filtered.map((item) => (
                <Link href={item.href} key={item.href} onClick={() => setOpen(false)}>
                  <strong>{item.label}</strong>
                  <span>{item.context}</span>
                </Link>
              ))}
              {!filtered.length ? <p>Nenhum destino encontrado.</p> : null}
            </nav>
            <div className="command-dialog-footer"><span>Enter abre o primeiro resultado</span><span>Esc fecha</span></div>
          </div>
        </div>
      ) : null}
    </>
  )
}
