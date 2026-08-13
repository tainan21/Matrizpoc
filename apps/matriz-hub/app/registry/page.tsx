import Link from "next/link"
import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel } from "../../src/ui/environment/status"
import { SurfaceState } from "../../src/ui/environment/SurfaceState"
import { MetricStrip, OperationalPageHeader } from "../../src/ui/structure/OperationalPage"
import { loadAppContracts } from "../../src/ui/structure/registry-source"

export default function RegistryPage() {
  const apps = loadAppContracts()
  const capabilities = apps.flatMap((app) => app.capabilities.map((capability) => ({ ...capability, appId: app.appId, appName: app.name })))
  const produced = apps.flatMap((app) => app.eventsProduced.map((event) => ({ event, appId: app.appId })))
  const consumed = apps.flatMap((app) => app.eventsConsumed.map((event) => ({ event, appId: app.appId })))

  return (
    <div className="hub-page">
      <OperationalPageHeader
        description="Contratos públicos registrados pelo bootstrap do Hub. Os nomes humanos explicam a função; IDs e eventos permanecem visíveis como vocabulário técnico."
        eyebrow="Estrutura / registry técnico"
        status={apps.length ? "available" : "unavailable"}
        statusLabel={apps.length ? "Registry disponível" : "Registry vazio"}
        title="Contratos do ecossistema"
      />
      <MetricStrip items={[
        { label: "Apps", value: apps.length, detail: "processo atual", status: "available", icon: "registry" },
        { label: "Capacidades", value: capabilities.length, detail: "ações declaradas", status: "available", icon: "tool" },
        { label: "Eventos produzidos", value: produced.length, detail: "contratos de saída", status: "running", icon: "event" },
        { label: "Eventos consumidos", value: consumed.length, detail: "contratos de entrada", status: "waiting", icon: "link" },
      ]} />

      {apps.length === 0 ? (
        <SurfaceState kind="unavailable" title="Registry sem apps" description="Nenhum contrato público foi registrado neste processo." />
      ) : (
        <section className="hub-contract-groups">
          <div className="hub-contract-group">
            <header><p className="hub-eyebrow">Ações disponíveis</p><h2>Capacidades declaradas</h2></header>
            <ul>{capabilities.map((capability) => <li key={`${capability.appId}:${capability.technicalLabel}`}><strong>{capability.label}</strong><small>{capability.technicalLabel} · {capability.appName}</small></li>)}</ul>
          </div>
          <div className="hub-contract-group">
            <header><p className="hub-eyebrow">Saídas</p><h2>Eventos produzidos</h2></header>
            <ul>{produced.map((item) => <li key={`${item.appId}:${item.event}`}><strong>{item.event.replaceAll(".", " · ")}</strong><small>{item.event} · {item.appId}</small></li>)}</ul>
          </div>
          <div className="hub-contract-group">
            <header><p className="hub-eyebrow">Entradas</p><h2>Eventos consumidos</h2></header>
            <ul>{consumed.map((item) => <li key={`${item.appId}:${item.event}`}><strong>{item.event.replaceAll(".", " · ")}</strong><small>{item.event} · {item.appId}</small></li>)}</ul>
          </div>
        </section>
      )}

      <section className="hub-structure-main">
        <header className="hub-structure-toolbar"><div><h2>Apps registrados</h2><small>Contrato público + estado no processo</small></div><Link className="hub-context-link" href="/catalog">Abrir catálogo detalhado</Link></header>
        <div className="hub-entity-rows">{apps.map((app) => (
          <Link className="hub-entity-row" href={`/catalog#${app.appId}`} key={app.appId}>
            <span className="hub-entity-row__mark"><HubIcon name="registry" size={18} /></span>
            <span className="hub-entity-row__identity"><strong>{app.name}</strong><small>{app.appId} · contract {app.contractVersion}</small></span>
            <span className="hub-entity-row__meta"><strong>{app.capabilities.length} capacidades</strong><span>{app.routes.length} rotas</span></span>
            <span className="hub-entity-row__meta"><strong>{app.relationsCount} relações</strong><span>v{app.version}</span></span>
            <StatusLabel compact status={app.status}>{app.statusLabel}</StatusLabel>
          </Link>
        ))}</div>
      </section>
    </div>
  )
}
