import { useEffect, useMemo, useRef, useState } from "react"

import type { DeckCommand } from "../../application/command-deck"
import { rankCommands } from "../../application/command-deck"

export function CommandDeck({
  commands,
  execute,
}: {
  readonly commands: readonly DeckCommand[]
  readonly execute: (id: string) => Promise<unknown> | unknown
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(0)
  const [confirmId, setConfirmId] = useState<string>()
  const [recent, setRecent] = useState<readonly string[]>([])
  const input = useRef<HTMLInputElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const results = useMemo(() => rankCommands(query, commands, recent), [commands, query, recent])

  const close = () => {
    setOpen(false)
    setQuery("")
    setSelected(0)
    setConfirmId(undefined)
    previousFocus.current?.focus()
  }

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.key.toLocaleLowerCase() === "k")) return
      event.preventDefault()
      if (open) {
        close()
      } else {
        previousFocus.current = document.activeElement as HTMLElement | null
        setOpen(true)
      }
    }
    window.addEventListener("keydown", shortcut)
    return () => window.removeEventListener("keydown", shortcut)
  })

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  useEffect(() => {
    setSelected(0)
    setConfirmId(undefined)
  }, [query])

  if (!open) return null

  const run = (command: DeckCommand | undefined) => {
    if (!command) return
    if (command.destructive && confirmId !== command.id) {
      setConfirmId(command.id)
      return
    }
    void Promise.resolve(execute(command.id))
      .then(() => {
        setRecent((items) => [command.id, ...items.filter((id) => id !== command.id)].slice(0, 10))
      })
      .catch(() => undefined)
    close()
  }

  const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      close()
    } else if (event.key === "ArrowDown") {
      event.preventDefault()
      setSelected((index) => Math.min(index + 1, Math.max(0, results.length - 1)))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setSelected((index) => Math.max(0, index - 1))
    } else if (event.key === "Enter") {
      event.preventDefault()
      run(results[selected])
    }
  }

  return (
    <div className="deck-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="command-deck" role="dialog" aria-modal="true" aria-label="Matriz Command Deck">
        <div className="deck-search">
          <span aria-hidden="true">⌘</span>
          <input ref={input} role="combobox" aria-label="Buscar ações" aria-controls="deck-results" aria-expanded="true" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={keyDown} placeholder="ação · app · porta" />
          <kbd>ESC</kbd>
        </div>
        <div className="deck-results" id="deck-results" role="listbox">
          {results.map((command, index) => (
            <button key={command.id} type="button" role="option" aria-selected={index === selected} onMouseEnter={() => setSelected(index)} onClick={() => run(command)}>
              <span className={`deck-signal${command.destructive ? " is-danger" : ""}`} aria-hidden="true" />
              <strong>{command.label}</strong>
              <small>{command.status ?? command.group}</small>
              <b>{confirmId === command.id ? "ENTER NOVAMENTE" : command.group.toUpperCase()}</b>
            </button>
          ))}
          {!results.length ? <div className="deck-zero">00 / SEM AÇÃO</div> : null}
        </div>
        <div className="deck-footer"><span>↑↓ navegar</span><span>↵ executar</span><strong>CTRL K</strong></div>
      </div>
    </div>
  )
}
