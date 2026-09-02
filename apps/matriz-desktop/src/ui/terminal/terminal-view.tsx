import type { ReactNode } from "react"

import type { TerminalReadiness, TerminalSession } from "../../domain/types"
import type { TerminalState } from "./terminal-store"

const STATUS_LABEL: Record<TerminalSession["status"], string> = {
  starting: "iniciando",
  running: "executando",
  succeeded: "concluído",
  failed: "falhou",
  exited: "encerrado",
}

export interface TerminalViewProps {
  readonly state: TerminalState
  readonly readiness?: TerminalReadiness
  readonly error?: string
  readonly create: () => void
  readonly configureWorkspace?: () => void
  readonly activate: (sessionId: string) => void
  readonly interrupt: (sessionId: string) => void
  readonly close: (sessionId: string) => void
  readonly renderPane: (session: TerminalSession) => ReactNode
  readonly compact?: boolean
}

export function TerminalView({
  state,
  readiness,
  error,
  create,
  configureWorkspace,
  activate,
  interrupt,
  close,
  renderPane,
  compact = false,
}: TerminalViewProps) {
  const active = state.sessions.find(({ id }) => id === state.activeId)
  const blocked = readiness?.ready === false && !active

  return (
    <section className={`terminal-view${compact ? " terminal-view--compact" : ""}`} aria-label="Terminal">
      <div className="terminal-tabs" role="tablist" aria-label="Sessões do terminal">
        {state.sessions.map((session) => (
          <button
            type="button"
            role="tab"
            aria-selected={session.id === state.activeId}
            aria-label={`${session.title} · ${STATUS_LABEL[session.status]}`}
            className="terminal-tab"
            key={session.id}
            onClick={() => activate(session.id)}
          >
            <span className={`terminal-state terminal-state--${session.status}`} aria-hidden="true" />
            <span>{session.title}</span>
          </button>
        ))}
        <button
          type="button"
          className="terminal-new"
          aria-label="Nova sessão PowerShell"
          disabled={!state.canCreate || blocked}
          onClick={create}
        >
          +
        </button>
      </div>

      {error ? <p className="terminal-error" role="alert">{error}</p> : null}

      {active ? (
        <>
          <div className="terminal-toolbar">
            <span>{active.cwd}</span>
            <strong>{STATUS_LABEL[active.status]}</strong>
            <button type="button" aria-label={`Interromper ${active.title}`} onClick={() => interrupt(active.id)}>
              ^C
            </button>
            <button type="button" aria-label={`Fechar ${active.title}`} onClick={() => close(active.id)}>
              ×
            </button>
          </div>
          <div role="tabpanel" className="terminal-stage">
            {renderPane(active)}
          </div>
        </>
      ) : blocked ? (
        <div className="terminal-empty terminal-empty--blocked" role="status">
          <span aria-hidden="true">!</span>
          <strong>WORKSPACE NECESSÁRIO</strong>
          <p>Selecione o workspace Matriz para abrir o PowerShell.</p>
          {configureWorkspace ? (
            <button type="button" onClick={configureWorkspace}>Configurar workspace</button>
          ) : null}
        </div>
      ) : (
        <button type="button" className="terminal-empty" onClick={create}>
          <span>+</span>
          <strong>POWERSHELL</strong>
        </button>
      )}
    </section>
  )
}

