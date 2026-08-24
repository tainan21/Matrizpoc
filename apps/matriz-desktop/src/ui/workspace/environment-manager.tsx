import { Badge, Button } from "@matriz/design-ui/primitives"
import { useEffect, useMemo, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { DesktopAppId, EnvironmentDocument, RuntimeInstance } from "../../domain/types"

interface DraftVariable {
  key: string
  value?: string
  sensitive: boolean
  revealed: boolean
  source: string
  originalValue?: string
}

export function EnvironmentManager({ gateway, runtimes, restart, signal }: {
  gateway: DesktopGateway
  runtimes: readonly RuntimeInstance[]
  restart(appId: DesktopAppId): Promise<unknown>
  signal(kind: "success" | "error"): void
}) {
  const [appId, setAppId] = useState<DesktopAppId>(runtimes[0]?.id ?? "matriz-admin")
  const [files, setFiles] = useState<readonly import("../../domain/types").EnvironmentFile[]>([])
  const [fileName, setFileName] = useState(".env.local")
  const [document, setDocument] = useState<EnvironmentDocument>()
  const [draft, setDraft] = useState<readonly DraftVariable[]>([])
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const runtime = runtimes.find((item) => item.id === appId)
  const selectedLabel = runtime?.label ?? appId
  const filtered = useMemo(() => draft.filter(({ key }) => key.toLowerCase().includes(query.toLowerCase())), [draft, query])
  const dirtyCount = useMemo(() => {
    if (!document) return 0
    const original = document.variables
    let changes = Math.abs(draft.length - original.length)
    for (let index = 0; index < Math.min(draft.length, original.length); index += 1) {
      const current = draft[index]
      const baseline = original[index]
      if (current.key !== baseline.key || (!current.sensitive && current.value !== baseline.value) || (current.sensitive && current.revealed && current.value !== current.originalValue)) changes += 1
    }
    return changes
  }, [document, draft])

  useEffect(() => {
    let current = true
    setDocument(undefined)
    setDraft([])
    gateway.listEnvironments(appId).then((next) => {
      if (!current) return
      setFiles(next)
      setFileName((selected) => next.some(({ fileName: name }) => name === selected) ? selected : (next[0]?.fileName ?? ".env.local"))
    }).catch((cause: unknown) => current && setError(String(cause)))
    return () => { current = false }
  }, [appId, gateway])

  useEffect(() => {
    if (!fileName) return
    let current = true
    setError("")
    gateway.readEnvironment(appId, fileName).then((next) => {
      if (!current) return
      setDocument(next)
      setDraft(next.variables.map((variable) => ({ ...variable, revealed: !variable.sensitive, originalValue: variable.value })))
    }).catch((cause: unknown) => current && setError(String(cause)))
    return () => { current = false }
  }, [appId, fileName, gateway])

  const reveal = async (key: string) => {
    try {
      const value = await gateway.revealEnvironmentValue(appId, fileName, key)
      setDraft((items) => items.map((item) => item.key === key ? { ...item, value, originalValue: value, revealed: true } : item))
    } catch (cause) {
      setError(String(cause))
      signal("error")
    }
  }

  const save = async (andRestart: boolean) => {
    if (!document) return
    setBusy(true)
    setError("")
    try {
      const next = await gateway.saveEnvironment({
        appId,
        fileName,
        revision: document.revision,
        variables: draft.map(({ key, value, revealed }) => ({ key, value: revealed ? value : undefined })),
      })
      setDocument(next)
      setDraft(next.variables.map((variable) => ({ ...variable, revealed: !variable.sensitive, originalValue: variable.value })))
      if (andRestart && runtime?.ownership === "managed") await restart(appId)
      signal("success")
    } catch (cause) {
      setError(String(cause))
      signal("error")
    } finally {
      setBusy(false)
    }
  }

  const update = (key: string, patch: Partial<DraftVariable>) => setDraft((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item))
  const canLeaveDraft = () => !dirtyCount || window.confirm("Descartar alterações não salvas deste ambiente?")

  return (
    <section className="env-manager" aria-labelledby="env-title">
      <div className="workspace-heading">
        <div><span className="eyebrow">WORKSPACE / AMBIENTES</span><h1 id="env-title">.ENV MANAGER</h1><p>Variáveis por aplicação, ambiente e fonte.</p></div>
        <Badge tone={document?.missingRequired.length ? "warning" : "success"}>{document?.missingRequired.length ? `${document.missingRequired.length} PENDENTE` : "VÁLIDO"}</Badge>
      </div>

      <div className="workspace-selector-bar">
        <label>APLICAÇÃO<select aria-label="Aplicação" value={appId} onChange={(event) => { if (canLeaveDraft()) setAppId(event.target.value as DesktopAppId) }}>{runtimes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>AMBIENTE<select aria-label="Arquivo de ambiente" value={fileName} onChange={(event) => { if (canLeaveDraft()) setFileName(event.target.value) }}>{files.map((file) => <option key={file.fileName} value={file.fileName}>{file.fileName}</option>)}</select></label>
        <label className="env-search">BUSCAR<input aria-label="Buscar variável" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="chave..." /></label>
        <Button variant="secondary" onClick={() => setDraft((items) => [...items, { key: `NEW_VARIABLE_${items.length + 1}`, value: "", originalValue: undefined, sensitive: false, revealed: true, source: fileName }])}>NOVA VARIÁVEL</Button>
      </div>

      {document?.missingRequired.length ? <div className="env-warning"><strong>VARIÁVEIS OBRIGATÓRIAS AUSENTES</strong>{document.missingRequired.map((key) => <span key={key}>{key}</span>)}</div> : null}
      {error ? <div className="env-error" role="alert">{error}</div> : null}

      <div className="env-table" role="table" aria-label={`Variáveis de ${fileName}`}>
        <div className="env-row env-row--head" role="row"><span>VARIÁVEL</span><span>VALOR</span><span>FONTE</span><span>AÇÕES</span></div>
        {filtered.map((variable) => <div className="env-row" role="row" key={variable.key}>
          <input aria-label={`Chave ${variable.key}`} value={variable.key} onChange={(event) => update(variable.key, { key: event.target.value })} />
          <input aria-label={`Valor ${variable.key}`} value={variable.sensitive && !variable.revealed ? "••••••••" : (variable.value ?? "")} readOnly={variable.sensitive && !variable.revealed} onChange={(event) => update(variable.key, { value: event.target.value, revealed: true })} />
          <span><i className={variable.sensitive ? "is-secret" : ""}>{variable.sensitive ? "SENSÍVEL" : variable.source}</i></span>
          <span className="env-actions">{variable.sensitive ? <button aria-label={`${variable.revealed ? "Ocultar" : "Revelar"} ${variable.key}`} onClick={() => variable.revealed ? update(variable.key, { value: undefined, revealed: false }) : void reveal(variable.key)}>{variable.revealed ? "OCULTAR" : "REVELAR"}</button> : null}<button aria-label={`Excluir ${variable.key}`} onClick={() => setDraft((items) => items.filter(({ key }) => key !== variable.key))}>×</button></span>
        </div>)}
        {!filtered.length ? <div className="env-empty">Nenhuma variável neste ambiente.</div> : null}
      </div>

      <div className="env-footer">
        <span><b>{dirtyCount}</b> alterações não salvas · segredos permanecem fora do histórico</span>
        <div><Button variant="secondary" disabled={busy || !document} onClick={() => void save(false)}>SALVAR</Button><Button disabled={busy || runtime?.ownership !== "managed"} aria-label={`Aplicar e reiniciar ${selectedLabel}`} onClick={() => void save(true)}>APLICAR & REINICIAR</Button></div>
      </div>
    </section>
  )
}
