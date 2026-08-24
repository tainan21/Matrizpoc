import { Badge, Button } from "@matriz/design-ui/primitives"
import { useEffect, useMemo, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { CommerceSnapshot, StorePackage } from "../../domain/types"

export function StoreView({ gateway, signal }: { gateway: DesktopGateway; signal(kind: "success" | "error"): void }) {
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

  const transition = async (id: string, action: () => Promise<CommerceSnapshot>) => {
    setBusy(id); setError("")
    try { setSnapshot(await action()); signal("success") }
    catch (cause) { setError(String(cause)); signal("error") }
    finally { setBusy("") }
  }
  const openPackage = async (item: StorePackage) => {
    setBusy(item.id); setError("")
    try {
      const runtime = (await gateway.runtimeSnapshot()).find(({ id }) => id === item.appId)
      if (runtime?.status !== "ready") await gateway.restartRuntime(item.appId)
      await gateway.openRuntimeTarget({ appId: item.appId, routePath: "/" })
      signal("success")
    } catch (cause) { setError(String(cause)); signal("error") }
    finally { setBusy("") }
  }

  return <section className="store-view" aria-labelledby="store-title">
    <div className="store-header">
      <div><span className="eyebrow">ECOSSISTEMA / DISTRIBUIÇÃO</span><h1 id="store-title">MATRIZ STORE</h1><p>Aplicações e capacidades verificadas para o Control.</p></div>
      <div className="wallet-balance"><span>WALLET</span><strong><i>M</i>{snapshot?.wallet.balance.toLocaleString("pt-BR") ?? "—"}</strong><small>Matriz Credits · ledger nativo</small></div>
    </div>
    <div className="store-filterbar"><div>{categories.map((item) => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item.toUpperCase()}</button>)}</div><input aria-label="Buscar na Store" placeholder="Buscar apps e capacidades..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    {error ? <div className="env-error" role="alert">{error}</div> : null}
    <div className="store-layout">
      <div className="store-catalog">
        {packages.map((item) => <PackageCard key={item.id} item={item} busy={busy === item.id} selected={selectedId === item.id} inspect={() => setSelectedId(item.id)} acquire={() => void transition(item.id, () => gateway.acquirePackage(item.id))} install={() => void transition(item.id, () => gateway.installPackage(item.id))} open={() => void openPackage(item)} uninstall={() => void transition(item.id, () => gateway.uninstallPackage(item.id))} />)}
        {!packages.length ? <div className="store-empty">Nenhuma capacidade encontrada.</div> : null}
      </div>
      <aside className="store-side">
        {selected ? <div className="package-detail"><div className="package-icon package-icon--large">{monogram(selected.name)}</div><span>{selected.category}</span><h2>{selected.name}</h2><p>{selected.description}</p><dl><div><dt>VERSÃO</dt><dd>{selected.version}</dd></div><div><dt>DEV</dt><dd>{selected.developer}</dd></div><div><dt>COMPATIBILIDADE</dt><dd>{selected.compatibility}</dd></div></dl><h3>PERMISSÕES</h3>{selected.permissions.map((permission) => <code key={permission}>{permission}</code>)}</div> : <div className="package-detail package-detail--empty"><span>SELECIONE UM PACOTE</span><p>Inspecione compatibilidade e permissões antes de adquirir.</p></div>}
        <div className="wallet-ledger"><div><span>HISTÓRICO DA WALLET</span><Badge tone="neutral">AUDITÁVEL</Badge></div>{snapshot?.wallet.transactions.slice(0, 6).map((transaction) => <div className="ledger-row" key={transaction.id}><i className={transaction.amount >= 0 ? "credit" : "debit"}>{transaction.amount >= 0 ? "+" : ""}{transaction.amount} M</i><strong>{transaction.title}</strong><small>{new Date(transaction.occurredAt).toLocaleDateString("pt-BR")}</small></div>)}</div>
      </aside>
    </div>
  </section>
}

function PackageCard({ item, busy, selected, inspect, acquire, install, open, uninstall }: { item: StorePackage; busy: boolean; selected: boolean; inspect(): void; acquire(): void; install(): void; open(): void; uninstall(): void }) {
  return <article className={`package-card${selected ? " is-selected" : ""}`}>
    <div className="package-icon">{monogram(item.name)}</div><div className="package-copy"><span>{item.category} · v{item.version}</span><h2><button aria-label={`Inspecionar ${item.name}`} onClick={inspect}>{item.name}</button></h2><p>{item.description}</p></div>
    <div className="package-state">{item.installed ? <Badge tone="success">INSTALADO</Badge> : item.owned ? <Badge tone="neutral">ADQUIRIDO</Badge> : <strong>{item.price ? `${item.price} M` : "GRÁTIS"}</strong>}</div>
    <div className="package-actions" onClick={(event) => event.stopPropagation()}>
      {!item.owned ? <Button disabled={busy} aria-label={item.price ? `Adquirir ${item.name} por ${item.price} M` : `Adquirir ${item.name} grátis`} onClick={acquire}>ADQUIRIR</Button> : null}
      {item.owned && !item.installed ? <Button disabled={busy} aria-label={`Instalar ${item.name}`} onClick={install}>INSTALAR</Button> : null}
      {item.installed ? <><Button aria-label={`Abrir ${item.name}`} onClick={open}>ABRIR</Button><button className="package-remove" aria-label={`Desinstalar ${item.name}`} onClick={uninstall}>REMOVER</button></> : null}
    </div>
  </article>
}

function monogram(name: string) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() }
