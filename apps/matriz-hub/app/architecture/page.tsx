import Link from "next/link"
import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel } from "../../src/ui/environment/status"
import { MetricStrip, OperationalPageHeader } from "../../src/ui/structure/OperationalPage"
import { loadAppContracts } from "../../src/ui/structure/registry-source"

export default function ArchitecturePage() {
  const apps = loadAppContracts()
  const relations = apps.flatMap((app) => app.eventsProduced.flatMap((event) =>
    apps.filter((candidate) => candidate.eventsConsumed.includes(event)).map((consumer) => ({ from: app, to: consumer, event })),
  ))

  return (
    <div className="hub-page">
      <OperationalPageHeader
        description="Mapa construído a partir dos manifests públicos. Ele representa contratos declarados — não tráfego runtime, latência ou disponibilidade de infraestrutura."
        eyebrow="Estrutura / arquitetura declarada"
        status="available"
        statusLabel="Contratos públicos"
        title="Arquitetura do ecossistema"
      />
      <MetricStrip items={[
        { label: "Apps", value: apps.length, detail: "manifests carregados", status: "available", icon: "architecture" },
        { label: "Relações de evento", value: relations.length, detail: "produtor + consumidor", status: relations.length ? "available" : "waiting", icon: "event" },
        { label: "Capacidades", value: apps.reduce((sum, app) => sum + app.capabilities.length, 0), detail: "contratos de ação", status: "available", icon: "tool" },
        { label: "Natureza do mapa", value: "Declarada", detail: "não é runtime", status: "official", icon: "docs" },
      ]} />
      <section className="hub-architecture-map">
        <header><p className="hub-eyebrow">Camadas do ambiente</p><h2>Apps e contratos compartilhados</h2><StatusLabel compact status="official">Manifest v1</StatusLabel></header>
        <div className="hub-architecture-map__apps">{apps.map((app) => (
          <Link href={`/catalog#${app.appId}`} key={app.appId}>
            <span><HubIcon name="architecture" size={20} /></span>
            <strong>{app.name}</strong>
            <small>{app.appId}</small>
            <em>{app.capabilities.length} capacidades · {app.relationsCount} integrações</em>
          </Link>
        ))}</div>
        <div className="hub-architecture-map__relations">
          <div><p className="hub-eyebrow">Conexões verificáveis</p><h2>Eventos com os dois lados declarados</h2></div>
          {relations.length ? relations.map((relation, index) => (
            <article key={`${relation.from.appId}:${relation.event}:${relation.to.appId}:${index}`}>
              <strong>{relation.from.name}</strong><span><HubIcon name="event" size={16} />{relation.event}</span><strong>{relation.to.name}</strong>
            </article>
          )) : <p>Nenhum contrato de evento possui produtor e consumidor simultaneamente.</p>}
        </div>
      </section>
    </div>
  )
}
