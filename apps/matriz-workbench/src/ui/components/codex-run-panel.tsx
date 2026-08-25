"use client"

import { useEffect, useState, useTransition } from "react"
import type {
  CodexRuntimeViewModel,
  CodexRunViewModel,
} from "../presenters/codex-run-presenter"

interface CodexRunPanelProps {
  projectId: string
  requestId: string
  requestRevision: string
  requestStatus: string
  runtime: CodexRuntimeViewModel
  initialRun?: CodexRunViewModel
}

type ApprovalDecision = "accept" | "accept_for_session" | "decline" | "cancel"

const statusLabels: Record<CodexRunViewModel["status"], string> = {
  starting: "iniciando",
  running: "em execução",
  waiting_approval: "aguardando aprovação",
  completed: "concluída",
  failed: "falhou",
  interrupted: "interrompida",
}

async function readResponse(response: Response): Promise<CodexRunViewModel> {
  const body = (await response.json()) as CodexRunViewModel & { error?: string }
  if (!response.ok) throw new Error(body.error ?? "A operação Codex falhou.")
  return body
}

export function CodexRunPanel({
  projectId,
  requestId,
  requestRevision,
  requestStatus,
  runtime,
  initialRun,
}: CodexRunPanelProps) {
  const [run, setRun] = useState(initialRun)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const endpoint = `/api/codex/projects/${projectId}/requests/${requestId}`

  useEffect(() => {
    if (!run?.connected) return
    const events = new EventSource(`${endpoint}/events`)
    const update = (message: MessageEvent<string>) => {
      setRun(JSON.parse(message.data) as CodexRunViewModel)
    }
    events.addEventListener("snapshot", update as EventListener)
    events.onerror = () => {
      events.close()
      setRun((current) => current ? { ...current, connected: false } : current)
    }
    return () => events.close()
  }, [endpoint, run?.connected])

  function mutate(path: string, body?: unknown) {
    setError("")
    startTransition(async () => {
      try {
        const response = await fetch(`${endpoint}/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body ?? {}),
        })
        setRun(await readResponse(response))
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Falha ao conversar com o Codex.")
      }
    })
  }

  function decide(approvalId: string, decision: ApprovalDecision) {
    mutate(`approvals/${approvalId}`, { decision })
  }

  const canStartFresh =
    !run && !["completed", "cancelled", "archived"].includes(requestStatus)
  const canResume =
    run &&
    ["failed", "interrupted"].includes(run.status) &&
    ["blocked", "in_progress", "interrupted"].includes(requestStatus)
  const canStart = runtime.available && !run?.connected && (canStartFresh || canResume)
  const staleApprovals =
    !run?.connected && Boolean(run?.approvals.some((approval) => approval.status === "pending"))
  const pendingApprovals =
    run?.connected
      ? run.approvals.filter((approval) => approval.status === "pending")
      : []

  return (
    <section className="codex-console" aria-live="polite">
      <header className="codex-console-header">
        <div>
          <span className="eyebrow">Codex App Server</span>
          <h2>Execução integrada</h2>
          <p>
            Runtime: <strong>{runtime.sourceLabel}</strong>
            {run?.threadId ? <> · thread <code>{run.threadId}</code></> : null}
          </p>
        </div>
        <div className="codex-actions">
          {run ? (
            <span className={`status-chip ${run.status}`}>
              {statusLabels[run.status]}
            </span>
          ) : null}
          {canStart ? (
            <button
              className="button primary"
              disabled={pending}
              onClick={() => mutate("start", { revision: requestRevision })}
              type="button"
            >
              {run ? "Retomar com Codex" : "Iniciar com Codex"}
            </button>
          ) : null}
          {run?.connected && ["starting", "running", "waiting_approval"].includes(run.status) ? (
            <button
              className="button danger-button"
              disabled={pending}
              onClick={() => mutate("cancel")}
              type="button"
            >
              Interromper
            </button>
          ) : null}
        </div>
      </header>

      {!runtime.available ? (
        <div className="codex-warning">
          <strong>Runtime indisponível</strong>
          <p>{runtime.reason}</p>
        </div>
      ) : null}
      {error ? <div className="codex-warning danger"><strong>Falha</strong><p>{error}</p></div> : null}
      {staleApprovals ? (
        <div className="codex-warning">
          <strong>Aprovação expirada</strong>
          <p>A sessão que solicitou essa aprovação não está mais conectada. Retome a execução para gerar uma nova solicitação segura.</p>
        </div>
      ) : null}

      {pendingApprovals.map((approval) => (
        <article className="approval-card" key={approval.id}>
          <div>
            <span className="eyebrow">
              {approval.kind === "command" ? "Comando solicita aprovação" : "Alteração solicita aprovação"}
            </span>
            <strong>{approval.title}</strong>
            {approval.detail ? <pre>{approval.detail}</pre> : null}
          </div>
          <div className="approval-actions">
            <button className="button primary" onClick={() => decide(approval.id, "accept")} type="button">
              Aprovar uma vez
            </button>
            <button className="button" onClick={() => decide(approval.id, "accept_for_session")} type="button">
              Aprovar na sessão
            </button>
            <button className="button danger-button" onClick={() => decide(approval.id, "decline")} type="button">
              Recusar
            </button>
          </div>
        </article>
      ))}

      {run ? (
        <div className="codex-console-grid">
          <div className="codex-stream">
            <div className="section-heading">
              <h3>Resposta em andamento</h3>
              <span>{run.connected ? "stream ativo" : "snapshot persistido"}</span>
            </div>
            <div className="agent-transcript">
              {run.latestMessage || "Aguardando a primeira mensagem do agente…"}
            </div>
            {run.error ? <p className="form-error">{run.error}</p> : null}
          </div>

          <aside className="codex-run-inspector">
            <div className="section-heading"><h3>Plano</h3><span>{run.plan.length}</span></div>
            {run.plan.map((item) => (
              <div className="run-line" key={`${item.step}-${item.status}`}>
                <i className={item.status} />
                <span>{item.step}</span>
              </div>
            ))}
            {!run.plan.length ? <p className="muted">Nenhum plano transmitido.</p> : null}

            <div className="section-heading"><h3>Comandos</h3><span>{run.commands.length}</span></div>
            {run.commands.map((command) => (
              <details className="command-result" key={command.id}>
                <summary>
                  <code>{command.command}</code>
                  <span className={`status-chip ${command.status}`}>{command.status}</span>
                </summary>
                {command.output ? <pre>{command.output}</pre> : null}
              </details>
            ))}
          </aside>
        </div>
      ) : (
        <div className="empty-inline codex-empty">
          <strong>Nenhuma execução integrada</strong>
          <span>O MCP continua disponível; iniciar aqui cria uma thread local acompanhável.</span>
        </div>
      )}

      {run?.diff ? (
        <details className="diff-viewer">
          <summary>
            <strong>Diff agregado</strong>
            <span>{run.changedFiles.length} arquivos detectados</span>
          </summary>
          <pre>{run.diff}</pre>
        </details>
      ) : null}
    </section>
  )
}
