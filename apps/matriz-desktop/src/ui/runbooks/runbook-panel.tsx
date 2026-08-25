import { Button } from "@matriz/design-ui/primitives"
import { useEffect, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { DesktopAppId, RunbookDefinition, RunbookExecution, RuntimeInstance } from "../../domain/types"

export function RunbookPanel({ gateway, runtimes, signal }: {
  gateway: DesktopGateway
  runtimes: readonly RuntimeInstance[]
  signal(kind: "success" | "error"): void
}) {
  const [catalog, setCatalog] = useState<readonly RunbookDefinition[]>([])
  const [selectedId, setSelectedId] = useState<RunbookDefinition["id"]>("validate-environment")
  const [appId, setAppId] = useState<DesktopAppId>(runtimes[0]?.id ?? "matriz-admin")
  const [execution, setExecution] = useState<RunbookExecution>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let current = true
    gateway.runbookCatalog().then((items) => { if (current) setCatalog(items) }).catch((cause: unknown) => { if (current) setError(String(cause)) })
    return () => { current = false }
  }, [gateway])
  const selected = catalog.find(({ id }) => id === selectedId)
  const runtime = runtimes.find(({ id }) => id === appId)

  const run = async () => {
    if (!selected) return
    setBusy(true); setError(""); setExecution(undefined)
    try {
      const result = await gateway.runRunbook(selected.id, appId)
      setExecution(result)
      signal(result.status === "completed" ? "success" : "error")
    } catch (cause) {
      setError(String(cause)); signal("error")
    } finally {
      setBusy(false)
    }
  }

  return <section className="runbook-panel" aria-labelledby="runbooks-title">
    <div className="runbook-heading"><div><span className="eyebrow">OPERAÇÕES CONFIÁVEIS</span><h2 id="runbooks-title">RUNBOOKS</h2><p>Sequências pequenas, fixas e executadas pelo Control.</p></div><label>APLICAÇÃO<select aria-label="Aplicação do runbook" value={appId} onChange={(event) => { setAppId(event.target.value as DesktopAppId); setExecution(undefined) }}>{runtimes.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label></div>
    <div className="runbook-layout">
      <div className="runbook-catalog">{catalog.map((item) => <button key={item.id} aria-label={`Selecionar ${item.label}`} aria-pressed={item.id === selectedId} onClick={() => { setSelectedId(item.id); setExecution(undefined); setError("") }}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div>
      <div className="runbook-detail">{selected ? <><header><div><span>{selected.id}</span><h3>{selected.label}</h3></div><Button disabled={busy} aria-label={`Executar ${selected.label} em ${runtime?.label ?? appId}`} onClick={() => void run()}>{busy ? "EXECUTANDO…" : "EXECUTAR"}</Button></header><div className="runbook-steps">{selected.steps.map((step, index) => { const result = execution?.steps.find(({ stepId }) => stepId === step); return <div key={step} data-status={result?.status ?? "pending"}><i>{result?.status === "completed" || result?.status === "available" ? "✓" : result?.status === "failed" ? "!" : index + 1}</i><span><strong>{step}</strong><small>{result?.detail ?? "Aguardando execução"}</small></span></div> })}</div>{execution?.target ? <button className="runbook-target" aria-label={`Abrir app ${runtime?.label ?? appId}`} onClick={() => void gateway.openRuntimeTarget(execution.target!)}><span>ROTA DISPONÍVEL</span><strong>{execution.target.routePath}</strong><b>ABRIR APP ↗</b></button> : null}{error ? <div className="env-error" role="alert">{error}</div> : null}</> : <p>Carregando catálogo nativo…</p>}</div>
    </div>
  </section>
}
