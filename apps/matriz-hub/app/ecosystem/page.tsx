import Link from "next/link"
import { getGlobalInstitutionalRegistry } from "@matriz/integration-registry-core/institutional"
import { ensureInstitutionalBootstrapped } from "../../src/bootstrap"
import { RefreshEcosystemButton } from "../../src/institutional/components/RefreshEcosystemButton"
import { toEcosystemVM } from "../../src/institutional/presenters"
import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel } from "../../src/ui/environment/status"
import { SurfaceState } from "../../src/ui/environment/SurfaceState"
import { MetricStrip, OperationalPageHeader } from "../../src/ui/structure/OperationalPage"

export const dynamic = "force-dynamic"

const SOURCE_LABELS: Record<string, string> = {
  internal_monorepo_app: "Apps internos",
  trusted_external_app: "Apps externos confiáveis",
  legacy_app: "Sistemas legados",
  third_party_service: "Serviços de terceiros",
  mcp_source: "Fontes MCP",
  institutional_source: "Fontes institucionais",
}

export default async function EcosystemPage() {
  await ensureInstitutionalBootstrapped()
  const registry = getGlobalInstitutionalRegistry()
  const vm = toEcosystemVM(registry.list(), registry.stats())
  const sourceRows = Object.entries(vm.sourceDistribution).filter(([, value]) => value > 0)
  const trustRows = Object.entries(vm.trustDistribution).filter(([, value]) => value > 0)

  return (
    <div className="hub-page">
      <OperationalPageHeader
        actions={<RefreshEcosystemButton />}
        description="Relações institucionais declaradas por cada projeto: o que produz, o que consome e onde existe conexão verificável."
        eyebrow="Estrutura / ecossistema"
        status={vm.sharedEvents.length ? "available" : "waiting"}
        statusLabel={vm.sharedEvents.length ? `${vm.sharedEvents.length} eventos conectados` : "Sem evento compartilhado"}
        title="Mapa de relações"
      />
      <MetricStrip items={[
        { label: "Superfícies produzidas", value: vm.produces.length, detail: "declarações de saída", status: "available", icon: "release" },
        { label: "Superfícies consumidas", value: vm.consumes.length, detail: "declarações de entrada", status: "available", icon: "link" },
        { label: "Eventos conectados", value: vm.sharedEvents.length, detail: "produtor + consumidor", status: vm.sharedEvents.length ? "complete" : "waiting", icon: "event" },
        { label: "Tipos de origem", value: sourceRows.length, detail: "classificação institucional", status: "available", icon: "layers" },
      ]} />

      <section className="hub-ecosystem-layout">
        <div className="hub-structure-main">
          <header className="hub-structure-toolbar"><div><h2>Eventos compartilhados</h2><small>Somente relações com produtor e consumidor declarados</small></div><Link className="hub-context-link" href="/architecture">Abrir arquitetura</Link></header>
          {vm.sharedEvents.length === 0 ? (
            <SurfaceState compact kind="empty" title="Nenhum evento conectado" description="Há superfícies declaradas, mas nenhum evento possui produtor e consumidor simultaneamente no snapshot." />
          ) : (
            <div className="hub-relation-map">
              {vm.sharedEvents.map((event) => (
                <article key={event.eventName}>
                  <div className="hub-relation-map__side"><small>Produzido por</small>{event.producers.map((id) => <Link href={`/projects/${encodeURIComponent(id)}`} key={id}>{id}</Link>)}</div>
                  <div className="hub-relation-map__event"><span><HubIcon name="event" size={18} /></span><strong>{event.eventName.replaceAll(".", " · ")}</strong><small>{event.eventName}</small></div>
                  <div className="hub-relation-map__side"><small>Consumido por</small>{event.consumers.map((id) => <Link href={`/projects/${encodeURIComponent(id)}`} key={id}>{id}</Link>)}</div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="hub-ecosystem-context">
          <section className="hub-contract-group">
            <header><p className="hub-eyebrow">Origem</p><h2>Classificação das fontes</h2></header>
            <ul>{sourceRows.map(([key, value]) => <li key={key}><strong>{SOURCE_LABELS[key] ?? key}</strong><small>{key} · {value} projetos</small></li>)}</ul>
          </section>
          <section className="hub-contract-group">
            <header><p className="hub-eyebrow">Confiança</p><h2>Níveis institucionais</h2></header>
            <ul>{trustRows.map(([key, value]) => <li key={key}><strong>{key}</strong><small>{value} projetos</small></li>)}</ul>
          </section>
        </aside>
      </section>
    </div>
  )
}
