import { Button } from "@matriz/design-ui/primitives"
import { useEffect, useMemo, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { DesktopAppId, DirectoryListing, ExplorerEntry, FilePreview, RuntimeInstance } from "../../domain/types"

export function FileExplorer({ gateway, runtimes, signal }: {
  gateway: DesktopGateway
  runtimes: readonly RuntimeInstance[]
  signal(kind: "success" | "error"): void
}) {
  const [appId, setAppId] = useState<DesktopAppId>(runtimes[0]?.id ?? "matriz-admin")
  const [path, setPath] = useState("")
  const [listing, setListing] = useState<DirectoryListing>()
  const [selected, setSelected] = useState<ExplorerEntry>()
  const [preview, setPreview] = useState<FilePreview>()
  const [query, setQuery] = useState("")
  const [error, setError] = useState("")
  const [confirmRecycle, setConfirmRecycle] = useState(false)

  const entries = useMemo(() => listing?.entries.filter(({ name }) => name.toLowerCase().includes(query.toLowerCase())) ?? [], [listing, query])

  const refresh = () => gateway.listDirectory(appId, path).then(setListing).catch((cause: unknown) => setError(String(cause)))

  useEffect(() => {
    setSelected(undefined)
    setPreview(undefined)
    setConfirmRecycle(false)
    setError("")
    void refresh()
    // gateway is a stable application boundary; path and appId are the navigation state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, path, gateway])

  const choose = async (entry: ExplorerEntry) => {
    if (entry.isDirectory) {
      setPath(entry.relativePath)
      return
    }
    setSelected(entry)
    setConfirmRecycle(false)
    try { setPreview(await gateway.previewFile(appId, entry.relativePath)) }
    catch (cause) { setPreview(undefined); setError(String(cause)) }
  }

  const mutate = async (action: () => Promise<void>) => {
    try { await action(); await refresh(); setSelected(undefined); setPreview(undefined); setConfirmRecycle(false); signal("success") }
    catch (cause) { setError(String(cause)); signal("error") }
  }

  const crumbs = path ? path.split("/") : []
  const parent = crumbs.slice(0, -1).join("/")

  return (
    <section className="file-explorer" aria-labelledby="explorer-title">
      <div className="workspace-heading"><div><span className="eyebrow">WORKSPACE / RECURSOS</span><h1 id="explorer-title">EXPLORADOR</h1><p>Arquivos e ativos do projeto, sem substituir seu editor.</p></div><select aria-label="Aplicação do Explorer" value={appId} onChange={(event) => { setAppId(event.target.value as DesktopAppId); setPath("") }}>{runtimes.map((runtime) => <option key={runtime.id} value={runtime.id}>{runtime.label}</option>)}</select></div>
      <div className="explorer-toolbar">
        <button aria-label="Voltar uma pasta" disabled={!path} onClick={() => setPath(parent)}>←</button>
        <div className="explorer-crumbs"><button onClick={() => setPath("")}>{runtimes.find(({ id }) => id === appId)?.label ?? appId}</button>{crumbs.map((crumb, index) => <span key={`${crumb}-${index}`}>› <button onClick={() => setPath(crumbs.slice(0, index + 1).join("/"))}>{crumb}</button></span>)}</div>
        <input aria-label="Buscar arquivos" placeholder="Buscar nesta pasta..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <button aria-label="Atualizar pasta" onClick={() => void refresh()}>↻</button>
      </div>
      {error ? <div className="env-error" role="alert">{error}</div> : null}
      <div className="explorer-layout">
        <div className="explorer-list" role="list">
          <div className="explorer-list-head"><span>NOME</span><span>TIPO</span><span>TAMANHO</span></div>
          {entries.map((entry) => <button className={selected?.relativePath === entry.relativePath ? "is-selected" : ""} key={entry.relativePath} aria-label={entry.isDirectory ? `Abrir pasta ${entry.name}` : `Selecionar ${entry.name}`} onClick={() => void choose(entry)}><span className={`file-glyph ${entry.isDirectory ? "is-folder" : ""}`}>{entry.isDirectory ? "▰" : "◇"}</span><strong>{entry.name}</strong><small>{entry.isDirectory ? "PASTA" : (entry.extension?.toUpperCase() ?? "ARQUIVO")}</small><i>{entry.isDirectory ? "—" : formatSize(entry.size)}</i></button>)}
          {!entries.length ? <div className="explorer-empty">Esta pasta está vazia.</div> : null}
        </div>
        <aside className="file-inspector">
          {selected ? <>
            <div className="inspector-head"><span>PREVIEW</span><strong>{selected.name}</strong><small>{formatSize(selected.size)}</small></div>
            <div className="preview-stage">{preview?.content.kind === "image" ? <img src={preview.content.value} alt={`Preview de ${selected.name}`} /> : null}{preview?.content.kind === "text" ? <pre>{preview.content.value}</pre> : null}{preview?.content.kind === "unsupported" ? <div><b>SEM PREVIEW</b><small>Abra no aplicativo padrão.</small></div> : null}</div>
            <div className="inspector-meta"><span>CAMINHO</span><code>{selected.relativePath}</code></div>
            <div className="inspector-actions">
              <Button variant="secondary" onClick={() => void gateway.openResourceInEditor(appId, selected.relativePath)}>ABRIR NO EDITOR</Button>
              <Button variant="secondary" onClick={() => void gateway.revealResource(appId, selected.relativePath)}>MOSTRAR NA PASTA</Button>
              <Button variant="secondary" onClick={() => void navigator.clipboard?.writeText(selected.relativePath)}>COPIAR CAMINHO</Button>
              <Button variant="secondary" onClick={() => { const name = window.prompt("Novo nome", selected.name); if (name) void mutate(() => gateway.renameResource(appId, selected.relativePath, name)) }}>RENOMEAR</Button>
              <Button variant="secondary" onClick={() => { const name = window.prompt("Nome da cópia", `copy-${selected.name}`); if (name) void mutate(() => gateway.duplicateResource(appId, selected.relativePath, name)) }}>DUPLICAR</Button>
              <Button className="danger-button" aria-label={`${confirmRecycle ? "Confirmar mover" : "Mover"} ${selected.name} para a Lixeira`} onClick={() => confirmRecycle ? void mutate(() => gateway.recycleResource(appId, selected.relativePath)) : setConfirmRecycle(true)}>{confirmRecycle ? "CONFIRMAR LIXEIRA" : "MOVER À LIXEIRA"}</Button>
            </div>
          </> : <div className="inspector-empty"><span>◇</span><strong>SELECIONE UM ARQUIVO</strong><small>Imagens, SVG e código leve aparecem aqui.</small></div>}
        </aside>
      </div>
    </section>
  )
}

function formatSize(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
