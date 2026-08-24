import Link from "next/link"
import { collectAllTelemetry, getAllTelemetryClients } from "@matriz/platform-telemetry"
import { bootstrapMatrizHub } from "../../src/bootstrap"
import { StatusLabel, StatusMark } from "../../src/ui/environment/status"
import { SurfaceState } from "../../src/ui/environment/SurfaceState"
import { MetricStrip, OperationalPageHeader } from "../../src/ui/structure/OperationalPage"
import { presentActivity } from "../../src/ui/operations/operations-presenter"

export const dynamic = "force-dynamic"

export default async function TelemetryPage({ searchParams }: { readonly searchParams: Promise<{ app?: string; type?: string }> }) {
  bootstrapMatrizHub()
  const filters = await searchParams
  const clients = getAllTelemetryClients()
  const all = collectAllTelemetry()
  const filtered = all.filter((event) => (!filters.app || event.appId === filters.app) && (!filters.type || event.type.includes(filters.type)))
  const vm = presentActivity([], filtered.map((event) => ({ id: event.id, type: event.type, source: event.appId, occurredAt: event.occurredAt, category: event.category })))
  const hasFilters = Boolean(filters.app || filters.type)

  return (
    <div className="hub-page">
      <OperationalPageHeader
        description="Envelopes emitidos pelos clientes de telemetria registrados neste processo, com app e categoria visíveis."
        eyebrow="Operação / observabilidade"
        status={all.length ? "running" : "waiting"}
        statusLabel={all.length ? `${all.length} envelopes na sessão` : "Aguardando sinais"}
        title="Telemetria da instância"
      />
      <MetricStrip items={[
        { label: "Envelopes", value: all.length, detail: hasFilters ? `${filtered.length} após filtros` : "sessão atual", status: all.length ? "running" : "waiting", icon: "telemetry" },
        { label: "Clientes", value: clients.length, detail: "registrados no processo", status: clients.length ? "available" : "waiting", icon: "agent" },
        { label: "Fontes ativas", value: new Set(all.map((event) => event.appId)).size, detail: "apps com envelopes", status: "available", icon: "ecosystem" },
        { label: "Persistência", value: "Sessão", detail: "agregador em memória", status: "temporary", icon: "database" },
      ]} />
      <nav className="hub-filter-rail" aria-label="Filtrar telemetria por app">
        <Link aria-current={!filters.app ? "page" : undefined} href="/telemetry">Todos <small>{all.length}</small></Link>
        {clients.map((client) => {
          const count = all.filter((event) => event.appId === client.appId).length
          return <Link aria-current={filters.app === client.appId ? "page" : undefined} href={`/telemetry?app=${client.appId}`} key={client.appId}>{client.appId}<small>{count}</small></Link>
        })}
      </nav>
      <section className="hub-structure-main">
        <header className="hub-structure-toolbar"><div><h2>Sinais observados</h2><small>{hasFilters ? "Filtros aplicados pela URL" : "Todos os envelopes da sessão"}</small></div>{hasFilters ? <Link className="hub-context-link" href="/telemetry">Limpar filtros</Link> : null}</header>
        {vm.items.length === 0 ? (
          <SurfaceState compact kind={hasFilters ? "filtered" : "empty"} title={hasFilters ? "Nenhum sinal corresponde ao filtro" : "Nenhuma telemetria nesta instância"} description={hasFilters ? "Remova os filtros ou selecione outra fonte." : "Os clientes estão registrados, mas ainda não emitiram envelopes. Nenhum sinal foi falsificado."} />
        ) : (
          <ol className="hub-operations-stream">{vm.items.map((item) => (
            <li key={item.id}>
              <span className="hub-operations-stream__rail"><StatusMark status="running" /></span>
              <time dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString("pt-BR")}</time>
              <span className="hub-operations-stream__identity"><strong>{item.label}</strong><small>{item.technicalLabel}</small></span>
              <span className="hub-operations-stream__source">{item.source}</span>
              <StatusLabel compact status="running">{item.category ?? "Sem categoria"}</StatusLabel>
            </li>
          ))}</ol>
        )}
      </section>
    </div>
  )
}
