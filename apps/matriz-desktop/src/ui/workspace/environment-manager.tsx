import { Badge, Button } from "@matriz/design-ui/primitives"
import { useEffect, useMemo, useRef, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { DesktopAppId, EnvironmentComparison, EnvironmentDocument, EnvironmentExport, EnvironmentReferenceResult, RuntimeInstance } from "../../domain/types"
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
  const [comparison, setComparison] = useState<EnvironmentComparison>()
  const [selectedKeys, setSelectedKeys] = useState<readonly string[]>([])
  const [impact, setImpact] = useState<EnvironmentReferenceResult>()
  const [generatedExport, setGeneratedExport] = useState<EnvironmentExport>()
  const selectionGeneration = useRef(0)
  const impactGeneration = useRef(0)
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
    setComparison(undefined)
    setImpact(undefined)
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
    setComparison(undefined)
    setImpact(undefined)
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

  const compare = async () => {
    const targetFile = files.find(({ fileName: candidate }) => candidate !== fileName)?.fileName
    if (!targetFile) return
    setBusy(true)
    setError("")
    try {
      const next = await gateway.compareEnvironments(appId, fileName, targetFile)
      setComparison(next)
      setSelectedKeys([])
    } catch (cause) {
      setError(String(cause))
      signal("error")
    } finally {
      setBusy(false)
    }
  }

  const promote = async () => {
    if (!comparison || !selectedKeys.length) return
    setBusy(true)
    setError("")
    try {
      const next = await gateway.promoteEnvironment({
        appId,
        sourceFile: comparison.sourceFile,
        targetFile: comparison.targetFile,
        targetRevision: comparison.targetRevision,
        keys: selectedKeys,
      })
      selectionGeneration.current += 1
      setComparison(undefined)
      setSelectedKeys([])
      setFileName(next.fileName)
      setDocument(next)
      setDraft(next.variables.map((variable) => ({ ...variable, id: variable.key, originalKey: variable.key, revealed: !variable.sensitive, valueChanged: false, originalValue: variable.value })))
      signal("success")
    } catch (cause) {
      setError(String(cause))
      signal("error")
    } finally {
      setBusy(false)
    }
  }

  const inspectImpact = async (key: string) => {
    const generation = ++impactGeneration.current
    setBusy(true)
    setError("")
    setImpact(undefined)
    try {
      const next = await gateway.findEnvironmentReferences(appId, key)
      if (generation === impactGeneration.current) setImpact(next)
    } catch (cause) {
      if (generation !== impactGeneration.current) return
      setError(String(cause))
      signal("error")
    } finally {
      if (generation === impactGeneration.current) setBusy(false)
    }
  }

  const generateExport = async () => {
    setBusy(true); setError("")
    try { setGeneratedExport(await gateway.generateEnvironmentExport(appId)); signal("success") }
    catch (cause) { setError(String(cause)); signal("error") }
    finally { setBusy(false) }
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
        <div className="env-toolbar-actions"><Button variant="secondary" aria-label="Comparar ambientes" disabled={busy || dirtyCount > 0 || files.length < 2} onClick={() => void compare()}>COMPARAR</Button><Button variant="secondary" aria-label="Gerar template de infraestrutura" disabled={busy || dirtyCount > 0} onClick={() => void generateExport()}>GERAR TEMPLATE</Button><Button variant="secondary" onClick={() => setDraft((items) => [...items, { id: `new-${++newVariableId.current}`, key: `NEW_VARIABLE_${items.length + 1}`, originalKey: "", value: "", originalValue: undefined, sensitive: false, revealed: true, valueChanged: true, source: fileName }])}>NOVA VARIÁVEL</Button></div>
      </div>

      {document?.missingRequired.length ? <div className="env-warning"><strong>VARIÁVEIS OBRIGATÓRIAS AUSENTES</strong>{document.missingRequired.map((key) => <span key={key}>{key}</span>)}</div> : null}
      {error ? <div className="env-error" role="alert">{error}</div> : null}
      {generatedExport ? <div className="env-warning"><strong>{generatedExport.fileName}</strong><span>{generatedExport.keyCount} chaves · {generatedExport.generatedCount} valores locais gerados</span><button aria-label="Abrir template gerado" onClick={() => void gateway.revealEnvironmentExport(generatedExport.exportId).catch((cause: unknown) => setError(String(cause)))}>ABRIR PASTA</button></div> : null}

      {comparison ? <section className="env-compare" aria-labelledby="env-compare-title">
        <div className="env-compare-heading"><div><span className="eyebrow">{comparison.sourceFile} → {comparison.targetFile}</span><h2 id="env-compare-title">Comparação de ambientes</h2></div><button onClick={() => setComparison(undefined)}>VOLTAR</button></div>
        <div className="env-compare-table" role="table" aria-label="Diferenças entre ambientes">
          <div className="env-compare-row env-row--head" role="row"><span></span><span>VARIÁVEL</span><span>VALORES</span><span>ESTADO</span></div>
          {comparison.entries.map((entry) => <div className="env-compare-row" role="row" key={entry.key}>
            <input type="checkbox" aria-label={`Selecionar ${entry.key}`} checked={selectedKeys.includes(entry.key)} disabled={entry.status === "equal" || entry.status === "missingSource"} onChange={(event) => setSelectedKeys((keys) => event.target.checked ? [...keys, entry.key] : keys.filter((key) => key !== entry.key))} />
            <strong>{entry.key}</strong>
            <span>{entry.sensitive ? "VALOR PROTEGIDO" : `${entry.sourceValue ?? "—"} → ${entry.targetValue ?? "—"}`}</span>
            <i data-status={entry.status}>{entry.status === "equal" ? "IGUAL" : entry.status === "different" ? "ALTERADO" : entry.status === "missingTarget" ? "AUSENTE NO DESTINO" : "AUSENTE NA ORIGEM"}</i>
          </div>)}
        </div>
        <div className="env-compare-footer"><span>Somente as chaves selecionadas serão promovidas. Segredos não são exibidos.</span><Button disabled={busy || !selectedKeys.length} aria-label={`Promover ${selectedKeys.length} ${selectedKeys.length === 1 ? "variável" : "variáveis"}`} onClick={() => void promote()}>PROMOVER {selectedKeys.length}</Button></div>
      </section> : <div className="env-table" role="table" aria-label={`Variáveis de ${fileName}`}>
        <div className="env-row env-row--head" role="row"><span>VARIÁVEL</span><span>VALOR</span><span>FONTE</span><span>AÇÕES</span></div>
        {filtered.map((variable) => <div className="env-row" role="row" key={variable.id}>
          <input aria-label={`Chave ${variable.key}`} value={variable.key} readOnly={variable.sensitive && !variable.revealed} onChange={(event) => update(variable.id, { key: event.target.value })} />
          <input aria-label={`Valor ${variable.key}`} value={variable.sensitive && !variable.revealed ? "••••••••" : (variable.value ?? "")} readOnly={variable.sensitive && !variable.revealed} onChange={(event) => update(variable.id, { value: event.target.value, valueChanged: true, revealed: true })} />
          <span><i className={variable.sensitive ? "is-secret" : ""}>{variable.sensitive ? "SENSÍVEL" : variable.source}</i></span>
          <span className="env-actions"><button aria-label={`Ver impacto de ${variable.key}`} disabled={busy || !variable.originalKey} onClick={() => void inspectImpact(variable.key)}>IMPACTO</button>{variable.sensitive ? <button aria-label={`${variable.revealed ? "Ocultar" : "Revelar"} ${variable.key}`} onClick={() => variable.revealed ? update(variable.id, { revealed: false }) : void reveal(variable.id, variable.key)}>{variable.revealed ? "OCULTAR" : "REVELAR"}</button> : null}<button aria-label={`Excluir ${variable.key}`} onClick={() => setDraft((items) => items.filter(({ id }) => id !== variable.id))}>×</button></span>
        </div>)}
        {!filtered.length ? <div className="env-empty">Nenhuma variável neste ambiente.</div> : null}
      </div>}

      {impact ? <aside className="env-impact" aria-labelledby="env-impact-title">
        <div className="env-impact-heading"><div><span className="eyebrow">IMPACT RADAR</span><h2 id="env-impact-title">Impacto de {impact.key}</h2><p>{impact.matches.length} {impact.matches.length === 1 ? "referência" : "referências"} em {impact.scannedFiles} arquivos analisados{impact.truncated ? " · resultado limitado" : ""}</p></div><button aria-label="Fechar impacto" onClick={() => setImpact(undefined)}>×</button></div>
        <div className="env-impact-matches">{impact.matches.map((match) => <button key={`${match.relativePath}:${match.line}`} aria-label={`Abrir ${match.relativePath} no editor`} onClick={() => void gateway.openResourceInEditor(appId, match.relativePath).catch((cause: unknown) => { setError(String(cause)); signal("error") })}><strong>{match.relativePath}</strong><span>L{match.line}</span><small>{match.excerpt}</small></button>)}{!impact.matches.length ? <p>Nenhuma referência encontrada no escopo seguro do projeto.</p> : null}</div>
      </aside> : null}

      <div className="env-footer">
        <span><b>{dirtyCount}</b> alterações não salvas · segredos permanecem fora do histórico</span>
        <div><Button variant="secondary" disabled={busy || !document} onClick={() => void save(false)}>SALVAR</Button><Button disabled={busy || runtime?.ownership !== "managed"} aria-label={`Aplicar e reiniciar ${selectedLabel}`} onClick={() => void save(true)}>APLICAR & REINICIAR</Button></div>
      </div>
    </section>
  )
}
