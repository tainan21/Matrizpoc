import Link from "next/link"
import { redirect } from "next/navigation"
import { resolveActiveCompanyContext } from "../../../src/application/active-company"
import { readIngredients } from "../../../src/application/restaurant-service"
import { resolveCompanyPageFoundation } from "../../../src/auth/server-page-context"
import { SystemState } from "../../../src/ui/SystemState"
import { toStockListViewModel } from "../../../src/ui/presenters/stock.presenter"

export default async function StockPage() {
  const foundation = await resolveCompanyPageFoundation(); if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />; if (!foundation.preferredCompanyId) redirect("/")
  try { const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies); const items = toStockListViewModel(await readIngredients(context, foundation.services.restaurant)); return <main className="restaurant-page stock-page" data-experience="operations-v1"><header><div><span className="eyebrow">OPERAÇÃO AO VIVO</span><h1>Estoque</h1><p>Saldos por ingrediente, alertas e movimentos auditáveis.</p></div></header>{items.length === 0 ? <section className="restaurant-empty"><h2>Estoque ainda vazio</h2><p>Cadastre ingredientes antes de registrar movimentos.</p><Link href="/workspace/ingredients">Cadastrar ingredientes</Link></section> : <section className="stock-grid">{items.map((item) => <Link href={`/workspace/stock/${item.id}`} key={item.id} data-health={item.health}><span>{item.healthLabel}</span><h2>{item.name}</h2><strong>{item.balance}</strong><small>Alerta em {item.threshold}</small></Link>)}</section>}</main> } catch { return <SystemState kind="forbidden" /> }
}
