import { Badge, Button } from "@matriz/design-ui/primitives"
import { useEffect, useMemo, useRef, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { DesktopAppId, EnvironmentDocument, RuntimeInstance } from "../../domain/types"
import { useWorkspaceNavigationGuard } from "./navigation-guard"

interface DraftVariable {
  id: string
  key: string
  originalKey: string
  value?: string
  sensitive: boolean
  revealed: boolean
  valueChanged: boolean
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
  const selectionGeneration = useRef(0)
  const newVariableId = useRef(0)

  const runtime = runtimes.find((item) => item.id === appId)
  const selectedLabel = runtime?.label ?? appId
  const filtered = useMemo(() => draft.filter(({ key }) => key.toLowerCase().includes(query.toLowerCase())), [draft, query])
  const dirtyCount = useMemo(() => {
    if (!document) return 0
    const remaining = new Set(document.variables.map(({ key }) => key))
    let changes = 0
    for (const current of draft) {
      if (current.originalKey) remaining.delete(current.originalKey)
      if (!current.originalKey || current.key !== current.originalKey || current.valueChanged || (!current.sensitive && current.value !== current.originalValue)) changes += 1
    }
    return changes + remaining.size
  }, [document, draft])
  useWorkspaceNavigationGuard(dirtyCount > 0)

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
    const generation = ++selectionGeneration.current
    let current = true
    setError("")
    gateway.readEnvironment(appId, fileName).then((next) => {
      if (!current || generation !== selectionGeneration.current) return
      setDocument(next)
      setDraft(next.variables.map((variable) => ({ ...variable, id: variable.key, originalKey: variable.key, revealed: !variable.sensitive, valueChanged: false, originalValue: variable.value })))
    }).catch((cause: unknown) => current && setError(String(cause)))
    return () => { current = false }
  }, [appId, fileName, gateway])

  const reveal = async (id: string, key: string) => {
    const generation = selectionGeneration.current
    const selectedApp = appId
    const selectedFile = fileName
    try {
      const value = await gateway.revealEnvironmentValue(selectedApp, selectedFile, key)
      if (generation !== selectionGeneration.current || selectedApp !== appId || selectedFile !== fileName) return
      setDraft((items) => items.map((item) => item.id === id ? { ...item, value, originalValue: value, valueChanged: false, revealed: true } : item))
    } catch (cause) {
      if (generation !== selectionGeneration.current) return
      setError(String(cause))
      signal("error")
    }
  }

  const save = async (andRestart: boolean) => {
    if (!document) return
    const generation = selectionGeneration.current
    const selectedApp = appId
    const selectedFile = fileName
    setBusy(true)
    setError("")
    try {
      const next = await gateway.saveEnvironment({
        appId: selectedApp,
        fileName: selectedFile,
        revision: document.revision,
        variables: draft.map(({ key, originalKey, value, sensitive, valueChanged }) => ({ key, value: !sensitive || valueChanged || key !== originalKey ? value : undefined })),
      })
      if (generation !== selectionGeneration.current || selectedApp !== appId || selectedFile !== fileName) return
      setDocument(next)
      setDraft(next.variables.map((variable) => ({ ...variable, id: variable.key, originalKey: variable.key, revealed: !variable.sensitive, valueChanged: false, originalValue: variable.value })))
      if (andRestart && runtime?.ownership === "managed") await restart(selectedApp)
      signal("success")
    } catch (cause) {
      if (generation !== selectionGeneration.current) return
      setError(String(cause))
      signal("error")
    } finally {
      setBusy(false)
    }
  }

  const update = (id: string, patch: Partial<DraftVariable>) => setDraft((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))
  const canLeaveDraft = () => !dirtyCount || window.confirm("Descartar alterações não salvas deste ambiente?")
  const leaveDraft = (change: () => void) => {
    if (!canLeaveDraft()) return
    selectionGeneration.current += 1
    change()
  }

  return (
    <section className="env-manager" aria-labelledby="env-title">
      <div className="workspace-heading">
        <div><span className="eyebrow">WORKSPACE / AMBIENTES</span><h1 id="env-title">.ENV MANAGER</h1><p>Variáveis por aplicação, ambiente e fonte.</p></div>
        <Badge tone={document?.missingRequired.length ? "warning" : "success"}>{document?.missingRequired.length ? `${document.missingRequired.length} PENDENTE` : "VÁLIDO"}</Badge>
      </div>

      <div className="workspace-selector-bar">
        <label>APLICAÇÃO<select aria-label="Aplicação" disabled={busy} value={appId} onChange={(event) => leaveDraft(() => setAppId(event.target.value as DesktopAppId))}>{runtimes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label>AMBIENTE<select aria-label="Arquivo de ambiente" disabled={busy} value={fileName} onChange={(event) => leaveDraft(() => setFileName(event.target.value))}>{files.map((file) => <option key={file.fileName} value={file.fileName}>{file.fileName}</option>)}</select></label>
        <label className="env-search">BUSCAR<input aria-label="Buscar variável" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="chave..." /></label>
        <Button variant="secondary" onClick={() => setDraft((items) => [...items, { id: `new-${++newVariableId.current}`, key: `NEW_VARIABLE_${items.length + 1}`, originalKey: "", value: "", originalValue: undefined, sensitive: false, revealed: true, valueChanged: true, source: fileName }])}>NOVA VARIÁVEL</Button>
      </div>

      {document?.missingRequired.length ? <div className="env-warning"><strong>VARIÁVEIS OBRIGATÓRIAS AUSENTES</strong>{document.missingRequired.map((key) => <span key={key}>{key}</span>)}</div> : null}
      {error ? <div className="env-error" role="alert">{error}</div> : null}

      <div className="env-table" role="table" aria-label={`Variáveis de ${fileName}`}>
        <div className="env-row env-row--head" role="row"><span>VARIÁVEL</span><span>VALOR</span><span>FONTE</span><span>AÇÕES</span></div>
        {filtered.map((variable) => <div className="env-row" role="row" key={variable.id}>
          <input aria-label={`Chave ${variable.key}`} value={variable.key} readOnly={variable.sensitive && !variable.revealed} onChange={(event) => update(variable.id, { key: event.target.value })} />
          <input aria-label={`Valor ${variable.key}`} value={variable.sensitive && !variable.revealed ? "••••••••" : (variable.value ?? "")} readOnly={variable.sensitive && !variable.revealed} onChange={(event) => update(variable.id, { value: event.target.value, valueChanged: true, revealed: true })} />
          <span><i className={variable.sensitive ? "is-secret" : ""}>{variable.sensitive ? "SENSÍVEL" : variable.source}</i></span>
          <span className="env-actions">{variable.sensitive ? <button aria-label={`${variable.revealed ? "Ocultar" : "Revelar"} ${variable.key}`} onClick={() => variable.revealed ? update(variable.id, { revealed: false }) : void reveal(variable.id, variable.key)}>{variable.revealed ? "OCULTAR" : "REVELAR"}</button> : null}<button aria-label={`Excluir ${variable.key}`} onClick={() => setDraft((items) => items.filter(({ id }) => id !== variable.id))}>×</button></span>
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
