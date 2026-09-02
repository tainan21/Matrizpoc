import { Badge, Button } from "@matriz/design-ui/primitives"
import { useState } from "react"

import type { ManagedOperationId, RuntimeInstance } from "../../domain/types"

export function AgentsView({ runtimes, start, open }: {
  readonly runtimes: readonly RuntimeInstance[]
  readonly start: (operationId: ManagedOperationId) => Promise<unknown>
  readonly open: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const runtime = runtimes.find(({ id }) => id === "matriz-workbench")
  const ready = runtime?.status === "ready"
  const starting = runtime?.status === "starting"

  const startWorkbench = async () => {
    setBusy(true)
    setError("")
    try {
      await start("app.matriz-workbench.web")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o Workbench")
    } finally {
      setBusy(false)
    }
  }

  return <section className="agents-view" aria-labelledby="agents-title">
    <div className="section-head">
      <div><span className="eyebrow">COWORKING / WORKBENCH</span><h1 id="agents-title">AGENTES</h1><p>Control opera o runtime; tarefas, aprovações e histórico continuam no Workbench.</p></div>
      <Badge tone={ready ? "success" : starting ? "warning" : "neutral"}>{ready ? "ONLINE" : starting ? "INICIANDO" : "OFFLINE"}</Badge>
    </div>
    {error ? <p className="git-error" role="alert">{error}</p> : null}
    <div className="agents-cockpit">
      <article>
        <span className={`status-dot ${ready ? "ready" : starting ? "degraded" : "stopped"}`} />
        <div><small>AUTORIDADE DE COWORKING</small><strong>Matriz Workbench</strong><p>{runtime?.endpoint ?? "http://127.0.0.1:3005"}</p></div>
        {ready
          ? <Button aria-label="Abrir Workbench" onClick={open}>ABRIR WORKBENCH</Button>
          : <Button aria-label="Iniciar Workbench" disabled={busy || starting} onClick={() => void startWorkbench()}>{busy || starting ? "INICIANDO…" : "INICIAR WORKBENCH"}</Button>}
      </article>
      <div className="agents-boundaries">
        <div><strong>PROJETOS & TAREFAS</strong><span>Fonte local em <code>.matriz/**</code></span></div>
        <div><strong>CODEX</strong><span>Execuções iniciam somente com ação explícita no Workbench</span></div>
        <div><strong>APROVAÇÕES</strong><span>Continuam humanas e separadas do estado de execução</span></div>
      </div>
    </div>
    <p className="area-note">Nenhum agente, tarefa ou comando é criado automaticamente pelo Control.</p>
  </section>
}
