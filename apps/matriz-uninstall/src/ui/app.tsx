import { useEffect, useMemo, useState } from "react"
import { presentProducts } from "../application/product-presenter"
import type { CleanupCandidate, DesktopGateway, DistributionCatalogV1, InstalledProduct, ProductAction, ProductViewModel } from "../domain/types"
import "./styles.css"

interface Props { readonly gateway: DesktopGateway; readonly loadCatalog: () => Promise<DistributionCatalogV1> }

export function UninstallApp({ gateway, loadCatalog }: Props) {
  const [catalog, setCatalog] = useState<DistributionCatalogV1 | null>(null)
  const [installed, setInstalled] = useState<readonly InstalledProduct[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState("Inspecionando o Windows…")
  const [cleanup, setCleanup] = useState<{ product: ProductViewModel; candidates: readonly CleanupCandidate[] } | null>(null)
  const products = useMemo(() => catalog ? presentProducts(catalog.products, installed) : [], [catalog, installed])

  async function refresh() {
    try {
      const [nextCatalog, nextInstalled] = await Promise.all([loadCatalog(), gateway.listInstalled()])
      setCatalog(nextCatalog); setInstalled(nextInstalled); setMessage(`${nextInstalled.length} instalações Windows observadas.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao inspecionar a máquina.") }
  }
  useEffect(() => { void refresh() }, [])

  async function act(product: ProductViewModel, action: ProductAction) {
    if ((action === "uninstall" || action === "reinstall") && !window.confirm(`${action === "uninstall" ? "Desinstalar" : "Reinstalar"} ${product.title}? Seus dados serão preservados.`)) return
    if (action === "cleanup") { setCleanup({ product, candidates: await gateway.cleanupPreview(product.productId) }); return }
    setBusy(product.productId); setMessage(`${labels[action]} ${product.title}…`)
    try {
      const result = action === "install" ? await gateway.install(product.productId)
        : action === "update" ? await gateway.update(product.productId)
        : action === "reinstall" && product.installationId ? await gateway.reinstall(product.productId, product.installationId)
        : action === "uninstall" && product.installationId ? await gateway.uninstall(product.installationId)
        : { operationId: "invalid", status: "failed" as const, message: "A instalação não pôde ser confirmada." }
      setMessage(result.message); await refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : "Operação nativa falhou.") }
    finally { setBusy(null) }
  }

  async function clean(candidates: readonly CleanupCandidate[]) {
    if (!cleanup || !candidates.length || !window.confirm(`Liberar ${formatBytes(candidates.reduce((sum, item) => sum + item.estimatedBytes, 0))} de ${cleanup.product.title}?`)) return
    setBusy(cleanup.product.productId)
    try { const result = await gateway.cleanup(cleanup.product.productId, candidates.map(({ id }) => id)); setMessage(result.message); setCleanup(null); await refresh() }
    catch (error) { setMessage(error instanceof Error ? error.message : "Limpeza falhou.") }
    finally { setBusy(null) }
  }

  async function selfRemove() {
    if (!window.confirm(`Desinstalar o Matriz Uninstall ${gateway.shell === "tauri" ? "Tauri" : "Electron"}?`)) return
    const result = await gateway.selfUninstall(); setMessage(result.message)
  }

  return <main className="uninstall-shell">
    <header className="hero"><div><span className="eyebrow">MATRIZ / WINDOWS</span><h1>Instalar. Atualizar.<br/>Remover sem perder o controle.</h1><p>Uma central segura para todas as edições desktop Matriz.</p></div><div className="shell-pill">EDIÇÃO {gateway.shell.toUpperCase()}</div></header>
    <section className="status-bar"><span className="status-dot"/><span>{message}</span><button onClick={() => void refresh()}>Inspecionar novamente</button></section>
    <section className="product-grid" aria-label="Produtos Matriz">
      {products.map((product) => <article className="product-card" key={product.productId}>
        <div className="card-head"><div><span className={`runtime runtime-${product.runtime}`}>{product.runtime}</span><h2>{product.title}</h2></div><span className={`state state-${product.status}`}>{product.statusLabel}</span></div>
        <dl><div><dt>Instalada</dt><dd>{product.installedVersion ?? "—"}</dd></div><div><dt>Disponível</dt><dd>{product.availableVersion ?? "—"}</dd></div><div><dt>Espaço</dt><dd>{formatBytes(product.estimatedBytes)}</dd></div><div><dt>Confiança</dt><dd>{product.trust === "stable-signed" ? "Assinada" : "Não publicada"}</dd></div></dl>
        {product.installLocation && <p className="location" title={product.installLocation}>{product.installLocation}</p>}
        <div className="actions">{product.actions.map((action) => <button className={action === "uninstall" ? "danger" : ""} disabled={busy === product.productId} key={action} aria-label={`${labels[action]} ${product.title}`} onClick={() => void act(product, action)}>{labels[action]}</button>)}</div>
      </article>)}
    </section>
    {!products.length && <section className="empty"><h2>Catálogo ainda não carregado</h2><p>O modo offline funciona depois da primeira sincronização validada.</p></section>}
    <footer><span>Dados e configurações são preservados por padrão.</span><button className="text-danger" onClick={() => void selfRemove()}>Desinstalar este Matriz Uninstall</button></footer>
    {cleanup && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true"><h2>Liberar espaço de {cleanup.product.title}</h2><p>Somente cache, logs e temporários allowlisted.</p>{cleanup.candidates.map((item)=><div className="cleanup-row" key={item.id}><span>{item.category}<small>{item.displayPath}</small></span><strong>{formatBytes(item.estimatedBytes)}</strong></div>)}<div className="actions"><button onClick={() => setCleanup(null)}>Cancelar</button><button onClick={() => void clean(cleanup.candidates)}>Liberar espaço</button></div></section></div>}
  </main>
}

const labels: Record<ProductAction, string> = { install: "Instalar", update: "Atualizar", reinstall: "Reinstalar", uninstall: "Desinstalar", cleanup: "Liberar espaço" }
function formatBytes(bytes: number) { if (!bytes) return "—"; const units = ["B", "KB", "MB", "GB"]; const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3); return `${(bytes / 1024 ** exponent).toFixed(exponent ? 1 : 0)} ${units[exponent]}` }

