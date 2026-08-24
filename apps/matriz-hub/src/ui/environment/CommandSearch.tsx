"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HubIcon } from "./icons"
import { HUB_NAV_GROUPS, buildCommandItems, filterCommandItems } from "./navigation"

interface CommandSearchProps {
  readonly open: boolean
  readonly returnFocusRef: React.RefObject<HTMLButtonElement | null>
  readonly onClose: () => void
}

const COMMANDS = buildCommandItems(HUB_NAV_GROUPS)

export function CommandSearch({ open, returnFocusRef, onClose }: CommandSearchProps) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const results = React.useMemo(() => filterCommandItems(COMMANDS, query), [query])

  React.useEffect(() => {
    if (!open) return
    setQuery("")
    setActiveIndex(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  React.useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(results.length - 1, 0)))
  }, [results.length])

  const close = React.useCallback(() => {
    onClose()
    requestAnimationFrame(() => returnFocusRef.current?.focus())
  }, [onClose, returnFocusRef])

  function navigate(href: string) {
    close()
    router.push(href)
  }

  if (!open) return null

  return (
    <div
      className="hub-command-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) close()
      }}
      role="presentation"
    >
      <section
        aria-label="Navegação rápida"
        aria-modal="true"
        className="hub-command-panel"
        onKeyDown={(event) => {
          if (event.key === "Escape") close()
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setActiveIndex((index) => Math.min(index + 1, results.length - 1))
          }
          if (event.key === "ArrowUp") {
            event.preventDefault()
            setActiveIndex((index) => Math.max(index - 1, 0))
          }
          if (event.key === "Enter" && results[activeIndex]) {
            event.preventDefault()
            navigate(results[activeIndex].href)
          }
        }}
        role="dialog"
      >
        <label className="hub-command-panel__input">
          <HubIcon name="search" size={18} />
          <input
            aria-controls="hub-command-results"
            aria-label="Buscar áreas e ações"
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            placeholder="Ex.: saúde, telemetria, documentação…"
            ref={inputRef}
            value={query}
          />
          <kbd>Esc</kbd>
        </label>
        <div className="hub-command-results" id="hub-command-results" role="listbox">
          {results.length === 0 ? (
            <div className="hub-surface-state" data-compact="true">
              <span className="hub-surface-state__icon"><HubIcon name="search" size={20} /></span>
              <div>
                <h2>Nenhuma área encontrada</h2>
                <p>Tente uma ação, um domínio ou o nome técnico da função.</p>
              </div>
            </div>
          ) : results.map((item, index) => (
            <button
              aria-selected={index === activeIndex}
              className="hub-command-result"
              data-active={index === activeIndex}
              key={item.href}
              onClick={() => navigate(item.href)}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              type="button"
            >
              <HubIcon name={item.icon} size={18} />
              <span className="hub-command-result__copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <span className="hub-command-result__group">{item.groupLabel}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
