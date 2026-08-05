"use client"

import { useState, useTransition } from "react"
import type { NotificationConfig, NotificationOutboxItem } from "../../domain/notification"

async function jsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? "Falha ao atualizar notificações.")
  return body
}

export function NotificationCenter({
  projectId,
  initialConfig,
  initialItems,
}: {
  projectId: string
  initialConfig: NotificationConfig
  initialItems: NotificationOutboxItem[]
}) {
  const [config, setConfig] = useState(initialConfig)
  const [items, setItems] = useState(initialItems)
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  const base = `/api/collaboration/projects/${projectId}/notifications`

  function saveConfig(form: FormData) {
    startTransition(async () => {
      setMessage("")
      try {
        const response = await fetch(`${base}/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: form.get("enabled") === "on",
            channels: ["slack", "teams"].filter((value) => form.get(value) === "on"),
            events: ["blocked", "completed", "review_ready", "preview_ready"].filter(
              (value) => form.get(value) === "on",
            ),
            redaction: {
              includeSummary: form.get("includeSummary") === "on",
              includeFilePaths: form.get("includeFilePaths") === "on",
              includeExternalUrls: form.get("includeExternalUrls") === "on",
            },
            expectedRevision: config.revision,
          }),
        })
        setConfig(await jsonResponse<NotificationConfig>(response))
        setMessage("Preferências salvas. Nenhum segredo foi armazenado.")
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha ao salvar.")
      }
    })
  }

  function updateItem(item: NotificationOutboxItem, action: "retry" | "cancel") {
    startTransition(async () => {
      setMessage("")
      try {
        const response = await fetch(`${base}/outbox/${item.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, expectedRevision: item.revision }),
        })
        const next = await jsonResponse<NotificationOutboxItem>(response)
        setItems((current) => current.map((entry) => entry.id === next.id ? next : entry))
        setMessage(action === "retry" ? "Item recolocado na fila." : "Item cancelado.")
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha ao atualizar item.")
      }
    })
  }

  return (
    <div className="notification-center">
      <section className="notification-config panel">
        <div>
          <span className="score-kicker">Opt-in local</span>
          <h2>Política de notificações</h2>
          <p>
            Esta fase cria uma fila confiável e idempotente. O envio para provedores
            permanece desconectado até existir credencial externa aprovada.
          </p>
        </div>
        <form action={saveConfig} className="notification-config-form">
          <label className="check-row">
            <input name="enabled" type="checkbox" defaultChecked={config.enabled} />
            Habilitar criação de itens no outbox
          </label>
          <fieldset>
            <legend>Canais</legend>
            {(["slack", "teams"] as const).map((channel) => (
              <label className="check-row" key={channel}>
                <input name={channel} type="checkbox" defaultChecked={config.channels.includes(channel)} />
                {channel === "slack" ? "Slack" : "Microsoft Teams"}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Eventos</legend>
            {(["blocked", "completed", "review_ready", "preview_ready"] as const).map((event) => (
              <label className="check-row" key={event}>
                <input name={event} type="checkbox" defaultChecked={config.events.includes(event)} />
                {event.replaceAll("_", " ")}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Dados permitidos</legend>
            <label className="check-row">
              <input name="includeSummary" type="checkbox" defaultChecked={config.redaction.includeSummary} />
              Resumo textual
            </label>
            <label className="check-row">
              <input name="includeFilePaths" type="checkbox" defaultChecked={config.redaction.includeFilePaths} />
              Caminhos de arquivos (reservado ao adapter)
            </label>
            <label className="check-row">
              <input name="includeExternalUrls" type="checkbox" defaultChecked={config.redaction.includeExternalUrls} />
              URLs externas (reservado ao adapter)
            </label>
          </fieldset>
          <button className="button primary" disabled={pending}>Salvar política</button>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div><span className="score-kicker">Operacional</span><h2>Outbox</h2></div>
          <span className="count-badge">{items.length}</span>
        </div>
        {items.length ? (
          <div className="notification-list">
            {items.map((item) => (
              <article className="notification-item" key={item.id}>
                <div>
                  <span className={`status-chip status-${item.status}`}>{item.status}</span>
                  <strong>{item.title}</strong>
                  <p>{item.body || "Conteúdo ocultado pela política de redação."}</p>
                  <small>{item.channel} · {item.event} · tentativas {item.attempts}</small>
                </div>
                <div className="notification-actions">
                  {item.status === "failed" ? (
                    <>
                      <button className="button" disabled={pending} onClick={() => updateItem(item, "retry")} type="button">Reenfileirar</button>
                      <button className="button" disabled={pending} onClick={() => updateItem(item, "cancel")} type="button">Cancelar</button>
                    </>
                  ) : item.status === "queued" ? (
                    <button className="button" disabled={pending} onClick={() => updateItem(item, "cancel")} type="button">Cancelar</button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-inline">
            <strong>Nenhum evento aguardando entrega.</strong>
            <p>Ative a política; eventos futuros serão deduplicados por canal.</p>
          </div>
        )}
        <p aria-live="polite" className="form-message">{message}</p>
      </section>
    </div>
  )
}
