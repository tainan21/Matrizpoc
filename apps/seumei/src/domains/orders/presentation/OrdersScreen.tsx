"use client"

import * as React from "react"
import { Clock, CurrencyDollar, Package, Receipt, SpinnerGap, Truck } from "@phosphor-icons/react"
import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"
import type { OrdersService } from "../application/orders.service"
import type { OrderStatus } from "../domain/order"
import { toOrdersViewModel, type OrdersViewModel } from "./orders.presenter"

export function OrdersScreen({ orders, context }: { readonly orders: OrdersService; readonly context: SeumeiTenantContext }) {
  const [view, setView] = React.useState<OrdersViewModel | null>(null)
  const [status, setStatus] = React.useState<"all" | OrderStatus>("all")
  const [query, setQuery] = React.useState("")
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    const result = await orders.getOrders(context)
    if (result.ok) setView(toOrdersViewModel(result.orders))
    else setError("Não foi possível carregar os pedidos desta empresa.")
  }, [context, orders])

  React.useEffect(() => { void load() }, [load])

  const rows = React.useMemo(() => view?.rows.filter((row) => {
    const matchesStatus = status === "all" || row.status === status
    const normalized = query.trim().toLocaleLowerCase("pt-BR")
    return matchesStatus && (!normalized || `${row.shortId} ${row.customerName} ${row.itemSummary}`.toLocaleLowerCase("pt-BR").includes(normalized))
  }) ?? [], [query, status, view])

  async function advance(orderId: string, nextStatus: OrderStatus) {
    setBusy(orderId)
    setError(null)
    const result = await orders.setStatus(context, orderId as Parameters<OrdersService["setStatus"]>[1], nextStatus)
    setBusy(null)
    if (!result.ok) { setError("O status não pôde ser alterado."); return }
    await load()
  }

  if (!view) return <div className="seumei-state">Carregando operação de pedidos…</div>
  const metrics = [
    { label: "Pedidos hoje", value: view.metrics.total, detail: `${view.metrics.open} em operação`, icon: Receipt, tone: "purple" },
    { label: "Em preparo", value: view.metrics.preparing, detail: "Acompanhar cozinha", icon: SpinnerGap, tone: "amber" },
    { label: "Prontos", value: view.metrics.ready, detail: "Aguardando entrega", icon: Package, tone: "blue" },
    { label: "Volume do dia", value: view.metrics.revenueLabel, detail: "Pedidos registrados", icon: CurrencyDollar, tone: "green" },
  ] as const

  return <section className="seumei-orders">
    <header className="seumei-orders__header"><div><h1>Pedidos</h1><p>Acompanhe preparo, retirada e entrega em uma única operação.</p></div><span><i /> Operação online</span></header>
    {error ? <div className="seumei-inline-alert" role="alert">{error}</div> : null}
    <div className="seumei-order-metrics">{metrics.map(({ label, value, detail, icon: Icon, tone }) => <article key={label}><span data-tone={tone}><Icon size={22} weight="duotone" /></span><div><small>{label}</small><strong>{value}</strong><em>{detail}</em></div></article>)}</div>
    <div className="seumei-orders-toolbar"><label><Receipt size={17} /><input type="search" aria-label="Buscar pedido" placeholder="Buscar pedido ou cliente…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select aria-label="Status do pedido" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Todos os status</option><option value="placed">Novos pedidos</option><option value="preparing">Em preparo</option><option value="ready">Prontos</option><option value="delivered">Entregues</option><option value="cancelled">Cancelados</option></select><span>Atualização em tempo real</span></div>
    <div className="seumei-orders-board">
      <div className="seumei-orders-table-wrap"><table className="seumei-orders-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Horário</th><th>Total</th><th>Status</th><th>Ação</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td data-label="Pedido"><strong>{row.shortId}</strong></td><td data-label="Cliente"><strong>{row.customerName}</strong></td><td data-label="Itens"><span>{row.itemSummary}</span><small>{row.itemCount} {row.itemCount === 1 ? "item" : "itens"}</small></td><td data-label="Horário"><span className="seumei-order-time"><Clock size={15} />{row.createdAtLabel}</span></td><td data-label="Total"><strong>{row.totalLabel}</strong></td><td data-label="Status"><span className="seumei-order-status" data-tone={row.statusTone}>{row.statusLabel}</span></td><td data-label="Próxima ação">{row.nextStatus && row.nextActionLabel ? <button type="button" disabled={busy === row.id} aria-label={`${row.nextActionLabel} do pedido ${row.shortId}`} onClick={() => void advance(row.id, row.nextStatus!)}>{busy === row.id ? "Atualizando…" : row.nextActionLabel}</button> : <span className="seumei-order-finished"><Truck size={15} /> Finalizado</span>}</td></tr>)}</tbody></table>{rows.length === 0 ? <div className="seumei-order-empty">Nenhum pedido corresponde aos filtros.</div> : null}</div>
      <aside><h2>Fila operacional</h2><strong>{view.metrics.open}</strong><p>pedidos ainda exigem ação da equipe.</p><div><span>Novos</span><b>{view.rows.filter((row) => row.status === "placed").length}</b></div><div><span>Em preparo</span><b>{view.metrics.preparing}</b></div><div><span>Prontos</span><b>{view.metrics.ready}</b></div></aside>
    </div>
  </section>
}
