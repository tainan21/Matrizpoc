import type { CSSProperties } from "react"
import Link from "next/link"
import { DataOrigin, StatusLabel, StatusMark } from "./status"
import { HubIcon } from "./icons"
import { SurfaceState } from "./SurfaceState"
import type { HubOverviewVM } from "./types"

function formatMoment(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

function formatTechnicalLabel(value: string): string {
  return value.replaceAll(".", " · ").replaceAll("_", " ")
}

export function HubOverview({ viewModel }: { readonly viewModel: HubOverviewVM }) {
  const { health, nextAction } = viewModel

  return (
    <div className="hub-overview">
      <header className="hub-overview__heading">
        <div>
          <p className="hub-eyebrow">Centro operacional / visão geral</p>
          <h1>O ecossistema, em contexto.</h1>
          <p>
            Projetos, integrações e sinais reais organizados em um único ambiente de trabalho.
          </p>
        </div>
        <div className="hub-overview__heading-meta">
          <StatusLabel status={health.status}>{health.statusLabel}</StatusLabel>
          <time dateTime={viewModel.generatedAt}>Leitura {formatMoment(viewModel.generatedAt)}</time>
        </div>
      </header>

      <section className="hub-overview__primary" aria-label="Panorama operacional">
        <div className="hub-overview__portfolio hub-panel">
          <div className="hub-panel__heading">
            <div>
              <p className="hub-eyebrow">Portfólio registrado</p>
              <h2>Áreas ativas do ambiente</h2>
            </div>
            <Link href="/catalog">Ver registry visual</Link>
          </div>

          {viewModel.portfolio.length === 0 ? (
            <SurfaceState
              compact
              description="O registry técnico ainda não forneceu apps para esta instância."
              kind="empty"
              title="Nenhuma área registrada"
            />
          ) : (
            <div className="hub-portfolio-grid">
              {viewModel.portfolio.map((item, index) => (
                <Link
                  className="hub-portfolio-node"
                  href={item.href}
                  key={item.appId}
                  style={{ "--hub-node-accent": item.accentColor ?? "var(--hub-accent)" } as CSSProperties}
                >
                  <span className="hub-portfolio-node__index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="hub-portfolio-node__mark"><HubIcon name="project" size={20} /></span>
                  <span className="hub-portfolio-node__copy">
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>
                  <StatusLabel compact status={item.status}>{item.statusLabel}</StatusLabel>
                  <span className="hub-portfolio-node__metrics">
                    <span><b>{item.capabilitiesCount}</b> capacidades</span>
                    <span><b>{item.routesCount}</b> rotas</span>
                    <span><b>{item.readinessScore ?? "—"}</b> readiness</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="hub-overview__context" aria-label="Contexto prioritário">
          <section className="hub-health-orbit hub-panel">
            <div className="hub-panel__heading hub-panel__heading--compact">
              <div>
                <p className="hub-eyebrow">Saúde institucional</p>
                <h2>Leituras atuais</h2>
              </div>
              <HubIcon name="health" size={20} />
            </div>
            <div
              className="hub-health-orbit__score"
              data-status={health.status}
              style={{ "--hub-health-score": `${health.averageReadiness}%` } as CSSProperties}
            >
              <div>
                <strong>{health.averageReadiness}</strong><span>/100</span>
                <small>readiness médio</small>
              </div>
            </div>
            <dl className="hub-health-orbit__legend">
              <div><dt><StatusMark status="complete" />Saudáveis</dt><dd>{health.healthy}</dd></div>
              <div><dt><StatusMark status="attention" />Atenção</dt><dd>{health.degraded}</dd></div>
              <div><dt><StatusMark status="blocked" />Sem resposta</dt><dd>{health.offline}</dd></div>
              <div><dt><StatusMark status="unknown" />Sem sinal</dt><dd>{health.unknown}</dd></div>
            </dl>
            <Link className="hub-context-link" href="/health">Abrir leitura de saúde <HubIcon name="chevron" size={16} /></Link>
          </section>

          <section className="hub-next-action hub-panel" data-status={nextAction.status}>
            <div className="hub-next-action__icon"><HubIcon name="activity" size={24} /></div>
            <div>
              <p className="hub-eyebrow">Próxima ação sugerida</p>
              <h2>{nextAction.label}</h2>
              <span className="hub-technical-label">{nextAction.technicalLabel}</span>
              <p>{nextAction.description}</p>
              <small>{nextAction.consequence}</small>
            </div>
            <Link className="hub-action-button" href={nextAction.href}>Abrir contexto</Link>
          </section>
        </aside>
      </section>

      <section className="hub-flow-map hub-panel" aria-labelledby="hub-flow-title">
        <div className="hub-panel__heading">
          <div>
            <p className="hub-eyebrow">Mapa do ambiente</p>
            <h2 id="hub-flow-title">Relações declaradas pelos manifests</h2>
          </div>
          <Link href="/ecosystem">Explorar ecossistema</Link>
        </div>
        {viewModel.flow.length === 0 ? (
          <SurfaceState compact kind="empty" title="Sem relações declaradas" description="Os manifests ainda não registraram integrações." />
        ) : (
          <div className="hub-flow-map__track">
            {viewModel.flow.map((node, index) => (
              <div className="hub-flow-node" data-status={node.status} key={node.id}>
                <span className="hub-flow-node__port" />
                <span className="hub-flow-node__icon"><HubIcon name="layers" size={18} /></span>
                <span><strong>{node.label}</strong><small>{node.relations} relações</small></span>
                {index < viewModel.flow.length - 1 ? <span className="hub-flow-node__line" aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="hub-overview__secondary">
        <div className="hub-activity-stream hub-panel">
          <div className="hub-panel__heading">
            <div>
              <p className="hub-eyebrow">Atividade da instância</p>
              <h2>Eventos e telemetria</h2>
            </div>
            <div className="hub-panel__links"><Link href="/events">Eventos</Link><Link href="/telemetry">Telemetria</Link></div>
          </div>
          {viewModel.activity.items.length === 0 ? (
            <SurfaceState compact kind="empty" title={viewModel.activity.emptyTitle} description={viewModel.activity.emptyDescription} />
          ) : (
            <ol>
              {viewModel.activity.items.map((item) => (
                <li key={`${item.kind}:${item.id}`}>
                  <StatusMark status={item.status} />
                  <time dateTime={item.occurredAt}>{formatMoment(item.occurredAt)}</time>
                  <span className="hub-activity-stream__source">{item.source}</span>
                  <strong>{formatTechnicalLabel(item.label)}</strong>
                  <span className="hub-technical-label">{item.kind === "event" ? "Evento" : "Telemetry"}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside className="hub-attention hub-panel">
          <div className="hub-panel__heading">
            <div>
              <p className="hub-eyebrow">Precisa de você</p>
              <h2>Leituras prioritárias</h2>
            </div>
            <span className="hub-attention__count">{viewModel.attention.length}</span>
          </div>
          {viewModel.attention.length === 0 ? (
            <SurfaceState compact kind="empty" title="Nenhuma leitura crítica" description="Todos os projetos com sinal estão saudáveis." />
          ) : (
            <ul>
              {viewModel.attention.map((item) => (
                <li key={item.id}>
                  <StatusMark status={item.status} />
                  <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  <Link href={item.href} aria-label={`Abrir ${item.label}`}><HubIcon name="chevron" size={16} /></Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      <section className="hub-origin-strip" aria-label="Origem e persistência dos dados">
        {viewModel.origins.map((origin) => <DataOrigin key={origin.id} origin={origin} />)}
      </section>
    </div>
  )
}
