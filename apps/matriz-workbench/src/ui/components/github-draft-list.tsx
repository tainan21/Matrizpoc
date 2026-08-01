"use client"

import { useState } from "react"
import type { DeliveryDraft } from "../../application/collaboration/delivery-provider"
import type { DeliveryReceipt } from "../../domain/delivery"

interface GitHubDraft {
  taskId: string
  status: string
  draft: DeliveryDraft
  handoff: string
  receipt?: DeliveryReceipt
}

export function GitHubDraftList({
  drafts,
  projectId,
}: {
  drafts: GitHubDraft[]
  projectId: string
}) {
  const [message, setMessage] = useState("")
  const [items, setItems] = useState(drafts)
  const [pendingTask, setPendingTask] = useState("")

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      setMessage(`${label} copiado.`)
    } catch {
      setMessage("Não foi possível copiar. Selecione o conteúdo manualmente.")
    }
  }

  async function recordReceipt(taskId: string, form: FormData) {
    setMessage("")
    setPendingTask(taskId)
    const current = items.find((item) => item.taskId === taskId)?.receipt
    try {
      const response = await fetch(
        `/api/collaboration/projects/${projectId}/github/issues/${taskId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: String(form.get("url") ?? ""),
            expectedRevision: current?.revision,
          }),
        },
      )
      const body = await response.json() as DeliveryReceipt & { error?: string }
      if (!response.ok) throw new Error(body.error ?? "Não foi possível registrar a issue.")
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.taskId === taskId ? { ...item, receipt: body } : item,
        ),
      )
      setMessage(`Issue #${body.externalId} vinculada ao Workbench.`)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Falha ao registrar a issue.")
    } finally {
      setPendingTask("")
    }
  }

  return (
    <>
      <section className="github-drafts">
        {items.map(({ taskId, status, draft, handoff, receipt }) => (
          <article key={taskId}>
            <header>
              <div>
                <span className="eyebrow">{taskId}</span>
                <h2>{draft.title}</h2>
              </div>
              <span className={`status-chip ${status}`}>{status.replace("_", " ")}</span>
            </header>
            <div className="github-labels">
              {draft.labels.map((label) => <code key={label}>{label}</code>)}
            </div>
            <details>
              <summary>Prévia do corpo</summary>
              <pre>{draft.body}</pre>
            </details>
            <footer>
              <button className="button" onClick={() => copy(draft.body, "Corpo da issue")} type="button">
                Copiar issue
              </button>
              <button className="button primary" onClick={() => copy(handoff, "Handoff GitHub")} type="button">
                Copiar para Codex + GitHub
              </button>
              <small>{draft.idempotencyKey}</small>
            </footer>
            {receipt ? (
              <div className="delivery-receipt">
                <span className="eyebrow">Entrega registrada</span>
                <a href={receipt.url} rel="noreferrer" target="_blank">
                  GitHub issue #{receipt.externalId} ↗
                </a>
                <small>registrada em {new Date(receipt.recordedAt).toLocaleString("pt-BR")}</small>
              </div>
            ) : (
              <form action={(form) => recordReceipt(taskId, form)} className="delivery-receipt-form">
                <label htmlFor={`issue-url-${taskId}`}>URL retornada pelo GitHub</label>
                <div>
                  <input
                    id={`issue-url-${taskId}`}
                    name="url"
                    placeholder="https://github.com/owner/repo/issues/123"
                    required
                    type="url"
                  />
                  <button
                    className="button"
                    disabled={pendingTask === taskId}
                    type="submit"
                  >
                    {pendingTask === taskId ? "Registrando…" : "Vincular issue"}
                  </button>
                </div>
              </form>
            )}
          </article>
        ))}
        {!items.length ? (
          <div className="empty-inline">
            <strong>Nenhuma tarefa publicável</strong>
            <span>Itens concluídos e arquivados não geram drafts.</span>
          </div>
        ) : null}
      </section>
      {message ? <div aria-live="polite" className="toast" role="status">{message}</div> : null}
    </>
  )
}
