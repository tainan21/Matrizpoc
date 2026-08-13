"use client"

import Link from "next/link"
import type { RefObject } from "react"
import { HubIcon } from "./icons"

interface GlobalContextBarProps {
  readonly currentArea: string
  readonly session: {
    readonly userName: string
    readonly email: string
  }
  readonly commandTriggerRef: RefObject<HTMLButtonElement | null>
  readonly onToggleNavigation: () => void
  readonly onOpenCommand: () => void
  readonly onSignOut: () => void
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR") ?? "")
    .join("") || "MH"
}

export function GlobalContextBar({
  currentArea,
  session,
  commandTriggerRef,
  onToggleNavigation,
  onOpenCommand,
  onSignOut,
}: GlobalContextBarProps) {
  return (
    <header className="hub-global-bar">
      <Link className="hub-global-bar__brand" href="/" aria-label="Ir para a visão geral do Matriz Hub">
        <span className="hub-global-bar__mark" aria-hidden="true" />
        <span className="hub-global-bar__brand-copy">
          <strong>Matriz-Hub</strong>
          <small>ambiente operacional alpha</small>
        </span>
      </Link>

      <div className="hub-global-context" aria-label="Contexto atual">
        <button
          aria-label="Abrir navegação"
          className="hub-nav-toggle"
          onClick={onToggleNavigation}
          type="button"
        >
          <HubIcon name="menu" size={18} />
        </button>
        <span className="hub-global-context__item">
          <small>Você está aqui</small>
          <strong>{currentArea}</strong>
        </span>
        <span className="hub-global-context__item" data-tone="success">
          <small>Ambiente</small>
          <strong>Alpha local</strong>
        </span>
        <span className="hub-global-context__item">
          <small>Persistência</small>
          <strong>Fontes reais + fallback explícito</strong>
        </span>
      </div>

      <div className="hub-global-actions">
        <button
          className="hub-command-trigger"
          onClick={onOpenCommand}
          ref={commandTriggerRef}
          type="button"
        >
          <HubIcon name="search" size={16} />
          <span>Buscar uma área ou ação…</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="hub-user-menu" title={session.email}>
          <span className="hub-user-menu__avatar" aria-hidden="true">
            {initials(session.userName)}
          </span>
          <span className="hub-user-menu__copy">
            <strong>{session.userName}</strong>
            <small>{session.email}</small>
          </span>
          <button
            aria-label="Encerrar sessão"
            className="hub-icon-button"
            data-action="sign-out"
            onClick={onSignOut}
            type="button"
          >
            <HubIcon name="logout" size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
