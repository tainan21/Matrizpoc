import { getGlobalEventBus } from "@matriz/integration-events"
import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel, StatusMark } from "../../src/ui/environment/status"
import { SurfaceState } from "../../src/ui/environment/SurfaceState"
import { MetricStrip, OperationalPageHeader } from "../../src/ui/structure/OperationalPage"
import { presentActivity } from "../../src/ui/operations/operations-presenter"

export const dynamic = "force-dynamic"

export default function EventsPage() {
  const history = getGlobalEventBus().history()
  const vm = presentActivity(history.map((event) => ({
    id: event.id,
    type: event.name,
    source: event.sourceApp,
    occurredAt: event.occurredAt,
    version: event.version,
  })), [])

  return (
    <div className="hub-page">
      <OperationalPageHeader
        description="Eventos capturados pelo EventBus global neste processo. Ao reiniciar a instância, este histórico pode deixar de existir."
        eyebrow="Operação / eventos"
        status={vm.items.length ? "running" : "waiting"}
        statusLabel={vm.items.length ? "Atividade na sessão" : "Aguardando eventos"}
        title="Fluxo de eventos"
      />
      <MetricStrip items={[
        { label: "Eventos", value: vm.eventCount, detail: "sessão atual", status: vm.eventCount ? "running" : "waiting", icon: "event" },
        { label: "Fontes", value: vm.sources.length, detail: "apps emitentes", status: "available", icon: "ecosystem" },
        { label: "Envelope", value: "v1", detail: "contrato técnico", status: "official", icon: "docs" },
        { label: "Persistência", value: "Sessão", detail: "memória do processo", status: "temporary", icon: "database" },
      ]} />
      <section className="hub-activity-workspace">
        <div className="hub-structure-main">
          <header className="hub-structure-toolbar"><div><h2>Atividade mais recente</h2><small>Ordenada pelo horário do envelope</small></div><StatusLabel compact status="temporary">Sessão atual</StatusLabel></header>
          {vm.items.length === 0 ? (
            <SurfaceState compact kind="empty" title="Nenhum evento nesta instância" description="Ações em apps integrados aparecerão aqui quando emitirem envelopes no EventBus. Nenhum evento foi criado apenas para preencher a tela." />
          ) : (
            <ol className="hub-operations-stream">{vm.items.map((item) => (
              <li key={item.id}>
                <span className="hub-operations-stream__rail"><StatusMark status={item.status} /></span>
                <time dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString("pt-BR")}</time>
                <span className="hub-operations-stream__identity"><strong>{item.label}</strong><small>{item.technicalLabel}</small></span>
                <span className="hub-operations-stream__source"><HubIcon name="project" size={16} />{item.source}</span>
                <StatusLabel compact status={item.status}>Capturado</StatusLabel>
              </li>
            ))}</ol>
          )}
        </div>
        <aside className="hub-operations-context">
          <section className="hub-contract-group"><header><p className="hub-eyebrow">Origem</p><h2>Fontes nesta sessão</h2></header>{vm.sources.length ? <ul>{vm.sources.map((source) => <li key={source.source}><strong>{source.source}</strong><small>{source.count} eventos capturados</small></li>)}</ul> : <SurfaceState compact kind="empty" title="Sem fontes" description="Nenhum app emitiu eventos." />}</section>
          <section className="hub-operation-note"><HubIcon name="database" size={20} /><div><strong>Histórico temporário</strong><p>O EventBus atual mantém envelopes em memória. Esta interface não representa persistência durável.</p></div></section>
        </aside>
      </section>
    </div>
  )
}
