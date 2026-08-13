import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel } from "../../src/ui/environment/status"
import { EntityAction, MetricStrip, OperationalPageHeader } from "../../src/ui/structure/OperationalPage"
import { loadAppContracts } from "../../src/ui/structure/registry-source"

export default function CatalogPage() {
  const apps = loadAppContracts()
  return (
    <div className="hub-page">
      <OperationalPageHeader
        description="Cada área mostra propósito, contrato, rotas e capacidades sem atravessar a fronteira interna de outro app."
        eyebrow="Estrutura / catálogo"
        status="available"
        statusLabel={`${apps.length} áreas registradas`}
        title="Áreas do ecossistema"
      />
      <MetricStrip items={[
        { label: "Áreas", value: apps.length, detail: "apps habilitados", status: "available", icon: "ecosystem" },
        { label: "Rotas", value: apps.reduce((total, app) => total + app.routes.length, 0), detail: "superfícies declaradas", status: "available", icon: "layers" },
        { label: "Capacidades", value: apps.reduce((total, app) => total + app.capabilities.length, 0), detail: "ações públicas", status: "available", icon: "tool" },
        { label: "Relações", value: apps.reduce((total, app) => total + app.relationsCount, 0), detail: "integrações declaradas", status: "available", icon: "graph" },
      ]} />
      <section className="hub-catalog-grid">
        {apps.map((app) => (
          <article className="hub-catalog-app" id={app.appId} key={app.appId}>
            <header>
              <span className="hub-catalog-app__mark"><HubIcon name="ecosystem" size={24} /></span>
              <div><p className="hub-eyebrow">{app.appId}</p><h2>{app.name}</h2></div>
              <StatusLabel compact status={app.status}>{app.statusLabel}</StatusLabel>
            </header>
            <p>{app.description}</p>
            <dl className="hub-inspector-list">
              <div><dt>Versão</dt><dd>v{app.version}</dd></div>
              <div><dt>Contrato</dt><dd>{app.contractVersion}</dd></div>
              <div><dt>Base URL</dt><dd><code>{app.baseUrl}</code></dd></div>
              <div><dt>Domínio</dt><dd>{app.domainSummary}</dd></div>
            </dl>
            <div className="hub-catalog-app__actions">
              <EntityAction href={app.routes[0]?.path ?? "/"} label="Abrir área principal" technicalLabel={app.routes[0]?.path ?? "/"} description={`${app.routes.length} rotas declaradas`} status="available" icon="overview" />
              <EntityAction href={`/registry#${app.appId}`} label="Examinar capacidades" technicalLabel="Manifest" description={`${app.capabilities.length} capacidades · ${app.relationsCount} relações`} status="available" icon="registry" />
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
