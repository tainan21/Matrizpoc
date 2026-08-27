"use client"

import { useEffect, useMemo, useRef, useState } from "react"

interface WorkspaceCommand {
  readonly label: string
  readonly href: string
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")
}

export function WorkspaceCommandPalette({ commands }: { readonly commands: readonly WorkspaceCommand[] }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const visibleCommands = useMemo(() => {
    const normalizedQuery = normalize(query.trim())
    const unique = new Map(commands.map((command) => [command.href, command]))
    return [...unique.values()].filter((command) => !normalizedQuery || normalize(command.label).includes(normalizedQuery))
  }, [commands, query])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  return (
    <>
      <button className="workspace-search-trigger" type="button" onClick={() => setOpen(true)}>
        Buscar no workspace
      </button>
      {open ? (
        <div className="workspace-search-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false)
        }}>
          <section className="workspace-search-palette" role="dialog" aria-modal="true" aria-label="Busca global" onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false)
          }}>
            <input ref={inputRef} type="search" aria-label="Buscar no Seumei" placeholder="Buscar menus…" value={query} onChange={(event) => setQuery(event.target.value)} />
            <nav aria-label="Resultados da busca">
              {visibleCommands.map((command) => <a key={command.href} href={command.href} onClick={() => setOpen(false)}>{command.label}</a>)}
              {visibleCommands.length === 0 ? <p>Nenhum resultado encontrado.</p> : null}
            </nav>
            <button type="button" onClick={() => setOpen(false)}>Fechar</button>
          </section>
        </div>
      ) : null}
    </>
  )
}
