import { Badge, Button } from "@matriz/design-ui/primitives"
import { useEffect, useMemo, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { CommerceSnapshot, DesktopAppId, HubFeatureId, StorePackage } from "../../domain/types"

export function StoreView({ gateway, signal, openControl }: { gateway: DesktopGateway; signal(kind: "success" | "error"): void; openControl?(featureId: HubFeatureId): void }) {
  const [snapshot, setSnapshot] = useState<CommerceSnapshot>()
  const [selectedId, setSelectedId] = useState<string>()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("Todos")
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")

  useEffect(() => { gateway.commerceSnapshot().then(setSnapshot).catch((cause: unknown) => setError(String(cause))) }, [gateway])
  const categories = useMemo(() => ["Todos", ...new Set(snapshot?.packages.map(({ category: value }) => value) ?? [])], [snapshot])
  const packages = useMemo(() => snapshot?.packages.filter((item) => (category === "Todos" || item.category === category) && `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())) ?? [], [category, query, snapshot])
  const selected = snapshot?.packages.find(({ id }) => id === selectedId)
  const installPackage = async (item: StorePackage) => {
    setBusy(item.id); setError("")
    try {
      const preview = await gateway.previewStoreInstall(item.id)
      const confirmed = window.confirm([
        `Instalar ${preview.displayName} ${preview.version}?`,
        `Publisher: ${preview.publisher}`,
        `Tamanho: ${formatBytes(preview.sizeBytes)}`,
        "O instalador será baixado, verificado e executado pelo Control.",
      ].join("\n"))
      if (!confirmed) return
      await gateway.confirmStoreInstall(preview.confirmationToken)
      setSnapshot(await gateway.commerceSnapshot())
      signal("success")
    } catch (cause) { setError(String(cause)); signal("error") }
    finally { setBusy("") }
  }
  const openPackage = async (item: StorePackage) => {
    setBusy(item.id); setError("")
    try {
      const target = await gateway.activatePackage(item.id)
      if (target.kind === "control") {
        openControl?.(target.featureId)
        signal("success")
        return
      }
      const runtime = (await gateway.runtimeSnapshot()).find(({ id }) => id === target.appId)
      if (!runtime || runtime.ownership === "none" || runtime.status === "stopped") {
        await gateway.startManagedOperation(target.operationId)
      } else if (runtime.ownership === "managed" && runtime.status !== "ready") {
        await gateway.restartRuntime(target.appId)
      } else if (runtime.ownership === "external" && runtime.status !== "ready") {
        throw new Error(`${item.name} está sob controle externo e ainda não está disponível.`)
      }
      await waitForRuntime(gateway, target.appId, item.name)
      const verifiedTarget = await gateway.activatePackage(item.id)
      if (verifiedTarget.kind !== "runtime") throw new Error("O alvo do pacote mudou durante a ativação.")
      await gateway.openRuntimeTarget({ appId: verifiedTarget.appId, routePath: verifiedTarget.routePath })
      signal("success")
    } catch (cause) { setError(String(cause)); signal("error") }
    finally { setBusy("") }
  }

  return <section className="store-view" aria-labelledby="store-title">
    <div className="store-header">
      <div><span className="eyebrow">ECOSSISTEMA / DISTRIBUIÇÃO</span><h1 id="store-title">MATRIZ STORE</h1><p>Aplicações e capacidades verificadas para o Control.</p></div>
      <div className="wallet-balance"><span>WALLET</span><strong><i>M</i>{snapshot?.wallet.balance.toLocaleString("pt-BR") ?? "—"}</strong><small>HISTÓRICO · SOMENTE LEITURA</small></div>
    </div>
    <div className="store-filterbar"><div>{categories.map((item) => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item.toUpperCase()}</button>)}</div><input aria-label="Buscar na Store" placeholder="Buscar apps e capacidades..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    {error ? <div className="env-error" role="alert">{error}</div> : null}
    <div className="store-layout">
      <div className="store-catalog">
        {packages.map((item) => <PackageCard key={item.id} item={item} busy={busy === item.id} selected={selectedId === item.id} inspect={() => setSelectedId(item.id)} open={() => void openPackage(item)} install={() => void installPackage(item)} />)}
        {!packages.length ? <div className="store-empty">Nenhuma capacidade encontrada.</div> : null}
      </div>
      <aside className="store-side">
        {selected ? <div className="package-detail"><div className="package-icon package-icon--large">{monogram(selected.name)}</div><span>{selected.category}</span><h2>{selected.name}</h2><p>{selected.description}</p><dl><div><dt>VERSÃO</dt><dd>{selected.version}</dd></div><div><dt>DEV</dt><dd>{selected.developer}</dd></div><div><dt>COMPATIBILIDADE</dt><dd>{selected.compatibility}</dd></div>{selected.status ? <div><dt>STATUS</dt><dd>{selected.status}</dd></div> : null}</dl>{selected.receipt ? <div className={`package-trust package-trust--${selected.trustStatus}`}><span>RECIBO LOCAL</span><strong>SOMENTE LEITURA</strong><small>SHA-256 · {selected.receipt.manifestDigest.slice(0, 12)}…</small></div> : null}<h3>PERMISSÕES</h3>{selected.permissions.length ? selected.permissions.map((permission) => <code key={permission}>{permission}</code>) : <code>CORE UTILITY</code>}</div> : <div className="package-detail package-detail--empty"><span>SELECIONE UM PACOTE</span><p>Inspecione origem, compatibilidade e estado operacional.</p></div>}
        <div className="wallet-ledger"><div><span>HISTÓRICO DA WALLET</span><Badge tone="neutral">AUDITÁVEL</Badge></div>{snapshot?.wallet.transactions.slice(0, 6).map((transaction) => <div className="ledger-row" key={transaction.id}><i className={transaction.amount >= 0 ? "credit" : "debit"}>{transaction.amount >= 0 ? "+" : ""}{transaction.amount} M</i><strong>{transaction.title}</strong><small>{new Date(transaction.occurredAt).toLocaleDateString("pt-BR")}</small></div>)}</div>
      </aside>
    </div>
  </section>
}

async function waitForRuntime(gateway: DesktopGateway, appId: DesktopAppId, packageName: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const runtime = (await gateway.runtimeSnapshot()).find(({ id }) => id === appId)
    if (runtime?.status === "ready") return runtime
    if (runtime?.ownership === "external" && runtime.status === "degraded") throw new Error(`${packageName} não respondeu na porta externa.`)
    await delay(250)
  }
  throw new Error(`${packageName} não ficou pronto dentro do tempo esperado.`)
}

function delay(milliseconds: number) { return new Promise((resolve) => window.setTimeout(resolve, milliseconds)) }

function PackageCard({ item, busy, selected, inspect, open, install }: { item: StorePackage; busy: boolean; selected: boolean; inspect(): void; open(): void; install(): void }) {
  return <article className={`package-card${selected ? " is-selected" : ""}`}>
    <div className="package-icon">{monogram(item.name)}</div><div className="package-copy"><span>{item.category} · v{item.version}</span><h2><button aria-label={`Inspecionar ${item.name}`} onClick={inspect}>{item.name}</button></h2><p>{item.description}</p></div>
    <div className="package-state">{item.builtIn ? <Badge tone="success">BUILT-IN</Badge> : item.installed ? <Badge tone="success">INSTALADO</Badge> : item.installable ? <Badge tone="neutral">DISPONÍVEL</Badge> : <Badge tone="neutral">INDISPONÍVEL</Badge>}</div>
    <div className="package-actions" onClick={(event) => event.stopPropagation()}>
      {item.installed && item.openable !== false ? <Button disabled={busy} aria-label={`Abrir ${item.name}`} onClick={open}>ABRIR</Button> : null}
      {item.installable ? <Button disabled={busy} aria-label={`Instalar ${item.name}`} onClick={install}>INSTALAR</Button> : null}
    </div>
  </article>
}

function monogram(name: string) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() }
function formatBytes(bytes: number) { return bytes < 1_048_576 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1_048_576).toFixed(1)} MB` }
