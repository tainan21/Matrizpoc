import { getGlobalExternalLinkStore } from "@matriz/integration-external-links"
import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel } from "../../src/ui/environment/status"
import { SurfaceState } from "../../src/ui/environment/SurfaceState"
import { MetricStrip, OperationalPageHeader } from "../../src/ui/structure/OperationalPage"

export default function ExternalLinksPage() {
  const links = getGlobalExternalLinkStore().list()
  const apps = new Set(links.flatMap((link) => [link.localApp, link.externalApp]))
  const tenants = new Set(links.map((link) => link.tenantId))

  return (
    <div className="hub-page">
      <OperationalPageHeader
        description="Vínculos entre entidades de apps distintos. Esta instância mantém os registros no store de integração atual; a persistência definitiva continua explícita como evolução futura."
        eyebrow="Estrutura / vínculos externos"
        status={links.length ? "available" : "waiting"}
        statusLabel={links.length ? `${links.length} vínculos nesta instância` : "Nenhum vínculo na instância"}
        title="Relações entre entidades"
      />
      <MetricStrip items={[
        { label: "Vínculos", value: links.length, detail: "store atual", status: links.length ? "available" : "waiting", icon: "link" },
        { label: "Apps envolvidos", value: apps.size, detail: "origem + destino", status: "available", icon: "ecosystem" },
        { label: "Tenants", value: tenants.size, detail: "escopo declarado", status: "available", icon: "user" },
        { label: "Persistência", value: "Processo", detail: "não é banco definitivo", status: "temporary", icon: "database" },
      ]} />
      <section className="hub-structure-main">
        <header className="hub-structure-toolbar"><div><h2>Mapa de vínculos</h2><small>Entidade local → relação → entidade externa</small></div></header>
        {links.length === 0 ? (
          <SurfaceState compact kind="empty" title="Nenhum vínculo registrado" description="Ações em Spot, Seumei ou Contracts podem registrar relações nesta instância. Nenhum estado foi simulado." />
        ) : (
          <div className="hub-external-links">{links.map((link) => (
            <article key={link.id}>
              <div><span className="hub-external-links__mark"><HubIcon name="project" size={18} /></span><p><strong>{link.localApp}</strong><small>{link.localEntityType} · {link.localEntityId}</small></p></div>
              <div className="hub-external-links__relation"><StatusLabel compact status="available">{link.relationType}</StatusLabel><HubIcon name="chevron" size={18} /></div>
              <div><span className="hub-external-links__mark"><HubIcon name="link" size={18} /></span><p><strong>{link.externalApp}</strong><small>{link.externalEntityType} · {link.externalEntityId}</small></p></div>
              <footer><span>Tenant {link.tenantId}</span><time dateTime={link.createdAt}>{new Date(link.createdAt).toLocaleString("pt-BR")}</time></footer>
            </article>
          ))}</div>
        )}
      </section>
    </div>
  )
}
