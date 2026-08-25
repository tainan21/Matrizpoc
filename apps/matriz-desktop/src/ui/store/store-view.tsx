import { Badge, Button } from "@matriz/design-ui/primitives"
import { useEffect, useMemo, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { CommerceSnapshot, ManagedOperationId, StorePackage } from "../../domain/types"

export function StoreView({ gateway, signal }: { gateway: DesktopGateway; signal(kind: "success" | "error"): void }) {
  const [snapshot, setSnapshot] = useState<CommerceSnapshot>()
  const [selectedId, setSelectedId] = useState<string>()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("Todos")
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [pendingInstall, setPendingInstall] = useState<string>()
  const [grantedPermissions, setGrantedPermissions] = useState<readonly string[]>([])

  useEffect(() => { gateway.commerceSnapshot().then(setSnapshot).catch((cause: unknown) => setError(String(cause))) }, [gateway])
  const categories = useMemo(() => ["Todos", ...new Set(snapshot?.packages.map(({ category: value }) => value) ?? [])], [snapshot])
  const packages = useMemo(() => snapshot?.packages.filter((item) => (category === "Todos" || item.category === category) && `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())) ?? [], [category, query, snapshot])
  const selected = snapshot?.packages.find(({ id }) => id === selectedId)
  const installTarget = snapshot?.packages.find(({ id }) => id === pendingInstall)

  const transition = async (id: string, action: () => Promise<CommerceSnapshot>) => {
    setBusy(id); setError("")
    try { setSnapshot(await action()); signal("success"); return true }
    catch (cause) { setError(String(cause)); signal("error"); return false }
    finally { setBusy("") }
  }
  const openPackage = async (item: StorePackage) => {
    setBusy(item.id); setError("")
    try {
      const runtime = (await gateway.runtimeSnapshot()).find(({ id }) => id === item.appId)
      if (!runtime || runtime.ownership === "none" || runtime.status === "stopped") {
        await gateway.startManagedOperation(`app.${item.appId}.web` as ManagedOperationId)
      } else if (runtime.ownership === "managed" && runtime.status !== "ready") {
        await gateway.restartRuntime(item.appId)
      } else if (runtime.ownership === "external" && runtime.status !== "ready") {
        throw new Error(`${item.name} está sob controle externo e ainda não está disponível.`)
      }
      await waitForRuntime(gateway, item)
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
        {packages.map((item) => <PackageCard key={item.id} item={item} busy={busy === item.id} selected={selectedId === item.id} inspect={() => setSelectedId(item.id)} acquire={() => void transition(item.id, () => gateway.acquirePackage(item.id))} install={() => { setSelectedId(item.id); setPendingInstall(item.id); setGrantedPermissions([]) }} open={() => void openPackage(item)} uninstall={() => void transition(item.id, () => gateway.uninstallPackage(item.id))} />)}
        {!packages.length ? <div className="store-empty">Nenhuma capacidade encontrada.</div> : null}
      </div>
      <aside className="store-side">
        {selected ? <div className="package-detail"><div className="package-icon package-icon--large">{monogram(selected.name)}</div><span>{selected.category}</span><h2>{selected.name}</h2><p>{selected.description}</p><dl><div><dt>VERSÃO</dt><dd>{selected.version}</dd></div><div><dt>DEV</dt><dd>{selected.developer}</dd></div><div><dt>COMPATIBILIDADE</dt><dd>{selected.compatibility}</dd></div></dl>{selected.installed ? <div className={`package-trust package-trust--${selected.trustStatus}`}><span>TRUST CENTER</span><strong>{selected.trustStatus === "verified" ? "VERIFICADO" : selected.trustStatus === "changed" ? "MANIFESTO ALTERADO" : "RECIBO AUSENTE"}</strong>{selected.receipt ? <small>SHA-256 · {selected.receipt.manifestDigest.slice(0, 12)}…</small> : null}{selected.trustStatus !== "verified" ? <Button variant="secondary" aria-label={`Reparar ${selected.name}`} disabled={busy === selected.id} onClick={() => void transition(selected.id, () => gateway.repairPackage(selected.id))}>REPARAR</Button> : null}</div> : null}<h3>PERMISSÕES</h3>{selected.permissions.map((permission) => <code key={permission}>{permission}</code>)}</div> : <div className="package-detail package-detail--empty"><span>SELECIONE UM PACOTE</span><p>Inspecione compatibilidade e permissões antes de adquirir.</p></div>}
        <div className="wallet-ledger"><div><span>HISTÓRICO DA WALLET</span><Badge tone="neutral">AUDITÁVEL</Badge></div>{snapshot?.wallet.transactions.slice(0, 6).map((transaction) => <div className="ledger-row" key={transaction.id}><i className={transaction.amount >= 0 ? "credit" : "debit"}>{transaction.amount >= 0 ? "+" : ""}{transaction.amount} M</i><strong>{transaction.title}</strong><small>{new Date(transaction.occurredAt).toLocaleDateString("pt-BR")}</small></div>)}</div>
      </aside>
    </div>
    {installTarget ? <div className="store-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingInstall(undefined) }}><section className="store-dialog" role="dialog" aria-modal="true" aria-labelledby="store-permissions-title"><span className="eyebrow">INSTALAÇÃO CONTROLADA</span><h2 id="store-permissions-title">Permissões de {installTarget.name}</h2><p>O pacote só será instalado quando todas as permissões do manifesto forem aceitas.</p><div>{installTarget.permissions.map((permission) => <label key={permission}><input type="checkbox" aria-label={`Permitir ${permission}`} checked={grantedPermissions.includes(permission)} onChange={(event) => setGrantedPermissions((current) => event.target.checked ? [...current, permission] : current.filter((item) => item !== permission))} /><span><code>{permission}</code><small>{permissionDescription(permission)}</small></span></label>)}</div><footer><Button variant="secondary" onClick={() => setPendingInstall(undefined)}>CANCELAR</Button><Button disabled={busy === installTarget.id || grantedPermissions.length !== installTarget.permissions.length} aria-label={`Confirmar instalação de ${installTarget.name}`} onClick={() => void transition(installTarget.id, () => gateway.installPackage(installTarget.id, grantedPermissions)).then((installed) => { if (installed) setPendingInstall(undefined) })}>CONFIRMAR INSTALAÇÃO</Button></footer></section></div> : null}
  </section>
}

async function waitForRuntime(gateway: DesktopGateway, item: StorePackage) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const runtime = (await gateway.runtimeSnapshot()).find(({ id }) => id === item.appId)
    if (runtime?.status === "ready") return runtime
    if (runtime?.ownership === "external" && runtime.status === "degraded") throw new Error(`${item.name} não respondeu na porta externa.`)
    await delay(250)
  }
  throw new Error(`${item.name} não ficou pronto dentro do tempo esperado.`)
}

function delay(milliseconds: number) { return new Promise((resolve) => window.setTimeout(resolve, milliseconds)) }

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
function permissionDescription(permission: string) {
  const descriptions: Record<string, string> = {
    "runtime:observe": "Ler estado e saúde dos runtimes.",
    "activity:read": "Ler eventos operacionais não sensíveis.",
    "actions:request": "Solicitar ações registradas com validação nativa.",
    "runtime:start": "Iniciar o app Matriz associado.",
    "workspace:read": "Ler recursos permitidos do workspace.",
  }
  return descriptions[permission] ?? "Capacidade declarada pelo catálogo confiável."
}
