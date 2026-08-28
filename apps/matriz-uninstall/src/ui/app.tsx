import { useEffect, useMemo, useState } from "react"
import symbolUrl from "../../assets/brand/symbol.svg?url"
import { presentProducts } from "../application/product-presenter"
import type { CleanupCandidate, DesktopGateway, DistributionCatalogV1, InstalledProduct, ProductAction, ProductStatus, ProductViewModel } from "../domain/types"
import "./styles.css"

interface Props { readonly gateway: DesktopGateway; readonly loadCatalog: () => Promise<DistributionCatalogV1> }
type Tab = "products" | "updates" | "cleanup" | "activity"
type Theme = "dark" | "light" | "contrast"
type Confirmation = { product: ProductViewModel; action: "uninstall" | "reinstall" } | null
type JournalEntry = { id: string; title: string; detail: string; status: "ok" | "working" | "error" }

const tabs: readonly { id: Tab; label: string }[] = [
  { id: "products", label: "Produtos" }, { id: "updates", label: "Atualizações" },
  { id: "cleanup", label: "Limpeza" }, { id: "activity", label: "Atividade" },
]
const actionLabels: Record<ProductAction, string> = { install: "Instalar", update: "Atualizar", reinstall: "Reinstalar", uninstall: "Desinstalar", cleanup: "Limpar" }
const statusLabels: Record<ProductStatus | "all", string> = { all: "Todos", installed: "Instalados", outdated: "Desatualizados", available: "Disponíveis", unavailable: "Indisponíveis", inconsistent: "Inconsistentes" }

export function UninstallApp({ gateway, loadCatalog }: Props) {
  const [catalog, setCatalog] = useState<DistributionCatalogV1 | null>(null)
  const [installed, setInstalled] = useState<readonly InstalledProduct[]>([])
  const [tab, setTab] = useState<Tab>("products")
  const [filter, setFilter] = useState<ProductStatus | "all">("all")
  const [theme, setTheme] = useState<Theme>("dark")
  const [busy, setBusy] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState("Inspecionando o Windows…")
  const [confirmation, setConfirmation] = useState<Confirmation>(null)
  const [cleanup, setCleanup] = useState<{ product: ProductViewModel; candidates: readonly CleanupCandidate[] } | null>(null)
  const [journal, setJournal] = useState<readonly JournalEntry[]>([])
  const products = useMemo(() => catalog ? presentProducts(catalog.products, installed) : [], [catalog, installed])
  const visible = useMemo(() => products.filter((product) => {
    if (tab === "updates" && product.status !== "outdated") return false
    if (tab === "cleanup" && !product.actions.includes("cleanup")) return false
    return filter === "all" || product.status === filter
  }), [products, tab, filter])
  const selected = products.find((product) => product.productId === selectedId) ?? visible[0] ?? null

  async function refresh() {
    try {
      const [nextCatalog, nextInstalled] = await Promise.all([loadCatalog(), gateway.listInstalled()])
      setCatalog(nextCatalog); setInstalled(nextInstalled)
      setSelectedId((current) => current ?? nextCatalog.products[0]?.productId ?? null)
      setMessage(`${nextInstalled.length} instalações Windows observadas.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao inspecionar a máquina.") }
  }
  useEffect(() => { void refresh() }, [])

  async function run(product: ProductViewModel, action: ProductAction) {
    if (action === "uninstall" || action === "reinstall") { setConfirmation({ product, action }); return }
    if (action === "cleanup") { setCleanup({ product, candidates: await gateway.cleanupPreview(product.productId) }); return }
    await execute(product, action)
  }

  async function execute(product: ProductViewModel, action: Exclude<ProductAction, "cleanup">) {
    setConfirmation(null); setBusy(product.productId)
    const entryId = crypto.randomUUID(); const progress = `${actionLabels[action]} ${product.title}…`
    setMessage(progress); setJournal((items) => [{ id: entryId, title: progress, detail: "Operação iniciada", status: "working" }, ...items])
    try {
      const result = action === "install" ? await gateway.install(product.productId)
        : action === "update" ? await gateway.update(product.productId)
          : action === "reinstall" && product.installationId ? await gateway.reinstall(product.productId, product.installationId)
            : action === "uninstall" && product.installationId ? await gateway.uninstall(product.installationId)
              : { operationId: "invalid", status: "failed" as const, message: "A instalação não pôde ser confirmada." }
      setMessage(result.message)
      setJournal((items) => items.map((item) => item.id === entryId ? { ...item, detail: result.message, status: result.status === "completed" ? "ok" : "error" } : item))
      await refresh()
    } catch (error) {
      const detail = error instanceof Error ? error.message : "A operação falhou."
      setMessage(detail); setJournal((items) => items.map((item) => item.id === entryId ? { ...item, detail, status: "error" } : item))
    } finally { setBusy(null) }
  }

  async function cleanSelected() {
    if (!cleanup) return
    setBusy(cleanup.product.productId)
    try { const result = await gateway.cleanup(cleanup.product.productId, cleanup.candidates.map(({ id }) => id)); setMessage(result.message); setCleanup(null); await refresh() }
    finally { setBusy(null) }
  }

  const heading = tab === "products" ? "Produtos Matriz" : tabs.find((item) => item.id === tab)?.label ?? "Produtos Matriz"
  return <main className="app-shell" data-theme={theme} data-testid="uninstall-shell">
    <header className="product-bar">
      <div className="brand-lockup"><img src={symbolUrl} alt="" /><span><strong>Matriz Uninstall</strong><small>Centro de manutenção</small></span></div>
      <nav role="tablist" aria-label="Áreas do aplicativo">{tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
      <div className="bar-actions"><span className="runtime-tag">{gateway.shell} · local</span><button className="icon-button" aria-label={theme === "dark" ? "Tema claro" : theme === "light" ? "Alto contraste" : "Tema escuro"} onClick={() => setTheme(theme === "dark" ? "light" : theme === "light" ? "contrast" : "dark")}>◐</button><button className="inspect-button" onClick={() => void refresh()}>Inspecionar</button></div>
    </header>

    <div className="workspace">
      <aside className="filter-rail" aria-label="Filtros"><p>VISÃO</p>{Object.entries(statusLabels).map(([id, label]) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id as ProductStatus | "all")}><span>{label}</span><b>{id === "all" ? products.length : products.filter((product) => product.status === id).length}</b></button>)}<div className="safety-note"><span>◆</span><strong>Dados protegidos</strong><small>Limpezas nunca removem documentos, projetos ou dados de negócio.</small></div></aside>

      <section className="product-stage">
        <div className="stage-heading"><div><span className="eyebrow">BIBLIOTECA LOCAL</span><h1>{heading}</h1><p>{tab === "activity" ? "Histórico desta sessão, sem telemetria externa." : "Instale, recupere e remova produtos com operações verificáveis."}</p></div><div className="summary"><strong>{installed.length}</strong><span>instalados</span><i /><strong>{products.filter((product) => product.status === "outdated").length}</strong><span>atualizações</span></div></div>
        {tab === "activity" ? <Activity entries={journal} /> : visible.length ? <div className="product-list">{visible.map((product) => <ProductRow key={product.productId} product={product} selected={selected?.productId === product.productId} busy={busy === product.productId} onSelect={() => setSelectedId(product.productId)} onAction={run} />)}</div> : <div className="empty-state"><span>✓</span><h2>Nada exige sua atenção</h2><p>Altere o filtro ou faça uma nova inspeção.</p></div>}
      </section>

      <aside className="inspector" aria-label="Detalhes do produto">{selected ? <><div className="inspector-mark"><img src={symbolUrl} alt="" /></div><span className={`state state-${selected.status}`}>{selected.statusLabel}</span><h2>{selected.title}</h2><p>{selected.runtime === "tauri" ? "Edição nativa recomendada: leve, rápida e integrada ao Windows." : "Edição de compatibilidade para casos específicos do navegador."}</p><dl><div><dt>Instalada</dt><dd>{selected.installedVersion ?? "—"}</dd></div><div><dt>Disponível</dt><dd>{selected.availableVersion ?? "—"}</dd></div><div><dt>Confiança</dt><dd>{selected.trust === "stable-signed" ? "Assinada" : selected.trust === "local-development" ? "Desenvolvimento" : "Não publicada"}</dd></div><div><dt>Espaço</dt><dd>{formatBytes(selected.estimatedBytes)}</dd></div></dl><div className="path-block"><small>LOCAL DE INSTALAÇÃO</small><code>{selected.installLocation ?? "Ainda não instalado"}</code></div><div className="inspector-actions">{selected.actions.map((action) => <button key={action} className={action === "uninstall" ? "danger" : action === "install" || action === "update" ? "primary" : ""} disabled={busy === selected.productId} onClick={() => void run(selected, action)} aria-label={`${actionLabels[action]} ${selected.title}`}>{actionLabels[action]}</button>)}</div></> : <div className="inspector-empty">Selecione um produto para ver os detalhes.</div>}</aside>
    </div>
    <footer className="status-strip"><span className="status-dot" /> <p>{message}</p><span>Catálogo {catalog?.schemaVersion ?? "—"}</span><span>Windows x64</span></footer>

    {confirmation && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label={confirmation.action === "uninstall" ? "Confirmar desinstalação" : "Confirmar reinstalação"}><span className="modal-symbol">!</span><p className="eyebrow">AÇÃO PROTEGIDA</p><h2>{confirmation.action === "uninstall" ? "Confirmar desinstalação" : "Confirmar reinstalação"}</h2><p>Você escolheu <strong>{confirmation.product.title}</strong>. Os dados pessoais e de negócio serão preservados.</p><div className="modal-actions"><button onClick={() => setConfirmation(null)}>Cancelar</button><button className="danger" aria-label={confirmation.action === "uninstall" ? "Confirmar desinstalação" : "Confirmar reinstalação"} onClick={() => void execute(confirmation.product, confirmation.action)}>{confirmation.action === "uninstall" ? "Desinstalar com segurança" : "Reinstalar agora"}</button></div></section></div>}
    {cleanup && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="Confirmar limpeza"><p className="eyebrow">PRÉ-VISUALIZAÇÃO</p><h2>Limpeza segura</h2><p>Somente itens permitidos para <strong>{cleanup.product.title}</strong>.</p><div className="cleanup-list">{cleanup.candidates.length ? cleanup.candidates.map((candidate) => <div className="cleanup-row" key={candidate.id}><span><strong>{candidate.category}</strong><small>{candidate.displayPath}</small></span><b>{formatBytes(candidate.estimatedBytes)}</b></div>) : <p>Nenhum resíduo seguro foi encontrado.</p>}</div><div className="modal-actions"><button onClick={() => setCleanup(null)}>Cancelar</button><button className="primary" disabled={!cleanup.candidates.length} onClick={() => void cleanSelected()}>Limpar {formatBytes(cleanup.candidates.reduce((sum, item) => sum + item.estimatedBytes, 0))}</button></div></section></div>}
  </main>
}

function ProductRow({ product, selected, busy, onSelect, onAction }: { product: ProductViewModel; selected: boolean; busy: boolean; onSelect: () => void; onAction: (product: ProductViewModel, action: ProductAction) => void }) {
  const primary = product.actions.find((action) => action === "update" || action === "install") ?? product.actions[0]
  return <article className={`product-row ${selected ? "selected" : ""}`} onClick={onSelect}><div className="product-glyph">{product.title.slice(0, 1)}</div><div className="product-copy"><div><h2>{product.title}</h2><span className="runtime">{product.runtime}</span></div><p>{product.installedVersion ? `Versão ${product.installedVersion}` : "Não instalado"} · {formatBytes(product.estimatedBytes)}</p></div><span className={`state state-${product.status}`}>{product.statusLabel}</span>{primary && <button className="row-action" disabled={busy} onClick={(event) => { event.stopPropagation(); onAction(product, primary) }} aria-label={`${actionLabels[primary]} ${product.title}`}>{busy ? "Aguarde…" : actionLabels[primary]}</button>}<span className="chevron">›</span></article>
}

function Activity({ entries }: { entries: readonly JournalEntry[] }) { return entries.length ? <div className="activity-list">{entries.map((entry) => <article key={entry.id}><i className={`activity-${entry.status}`} /><span><strong>{entry.title}</strong><small>{entry.detail}</small></span></article>)}</div> : <div className="empty-state"><span>◎</span><h2>Nenhuma operação nesta sessão</h2><p>As próximas ações verificadas aparecerão aqui.</p></div> }
function formatBytes(bytes: number) { if (!bytes) return "—"; const mb = bytes / 1024 / 1024; return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.max(1, Math.round(mb))} MB` }
