import { resolve } from "node:path"
import { loadControlInfrastructureInventory } from "../../src/integration/infrastructure/infrastructure-catalog"
import { presentInfrastructureInventory } from "../../src/ui/infrastructure/infrastructure-presenter"

export const dynamic = "force-dynamic"

export default async function InfrastructurePage() {
  const root = process.env.MATRIZ_WORKSPACE_ROOT ?? resolve(process.cwd(), "../..")
  const view = presentInfrastructureInventory(await loadControlInfrastructureInventory(root))
  return <main className="page operational-page">
    <header className="page-title">
      <span className="section-label">INFRAESTRUTURA / CONTRATOS V1</span>
      <h1>Infrastructure</h1>
      <p>Inventário declarativo e read-only. Valores, credenciais, comandos e caminhos absolutos não entram nesta interface.</p>
    </header>
    <section className="operation-grid" aria-label="Resumo dos contratos">
      {view.metrics.map((metric) => <article className="operation-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><p>{view.status.label}</p></article>)}
    </section>
    {view.issues.length ? <section className="desktop-only-notice status-critical"><span>CONTRATOS BLOQUEADOS</span><h2>Corrija antes de iniciar apps gerenciados</h2>{view.issues.map((issue) => <p key={issue}>{issue}</p>)}</section> : null}
    <section className="operation-table" aria-label="Infrastructure Contracts">
      {view.apps.map((app) => <article key={app.appId}>
        <span><b>{app.appId}</b><small>{app.classification} · {app.runtime}</small></span>
        <span><code>{app.database}</code><small>{app.identity} · {app.cache}</small></span>
        <span><small>{app.events}</small><small>{app.secrets}</small></span>
      </article>)}
    </section>
  </main>
}
