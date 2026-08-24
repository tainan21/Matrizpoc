"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import * as React from "react"
import { HubIcon } from "./icons"
import { InfoHint } from "./InfoHint"
import { OverviewMapFallback } from "./OverviewMapFallback"
import { OVERVIEW_VISUAL_MODE_KEY, parseOverviewVisualMode, type OverviewVisualMode } from "./overview-visual-mode"
import { StatusLabel, StatusMark } from "./status"
import type { HubGraphNodeVM, HubOverviewVM } from "./types"

const OverviewScene3D = dynamic(() => import("./OverviewScene3D"), {
  ssr: false,
  loading: () => <div className="hub-map-loading"><StatusMark status="running" /> Preparando mapa 3D</div>,
})

type DetailLevel = "summary" | "operation" | "detail"

function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas")
    return Boolean(window.WebGL2RenderingContext && canvas.getContext("webgl2"))
  } catch { return false }
}

function formatMoment(value?: string): string {
  if (!value) return "Sem leitura"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date)
}

function Inspector({ node, viewModel }: { readonly node?: HubGraphNodeVM; readonly viewModel: HubOverviewVM }) {
  if (!node) return <aside className="hub-spatial-inspector"><span className="hub-empty-line">Nenhuma área selecionada</span></aside>
  const next = node.id === viewModel.nextAction.href.split("/").at(-1) ? viewModel.nextAction : undefined
  return (
    <aside className="hub-spatial-inspector" aria-label={`Inspetor de ${node.label}`}>
      <header>
        <span className="hub-spatial-inspector__icon" style={{ color: node.accentColor ?? "var(--hub-accent)" }}><HubIcon name={node.id === "matriz-hub" ? "cube" : "project"} size={28} /></span>
        <span><small>Área selecionada</small><h2>{node.label}</h2><StatusLabel compact status={node.status}>{node.statusLabel}</StatusLabel></span>
      </header>
      <nav aria-label="Seções do inspetor"><button aria-current="page" type="button">Visão geral</button><a href="#hub-node-integrations">Integrações</a><a href="#hub-node-origin">Origem</a></nav>
      <section>
        <h3>Propriedades <InfoHint label="Origem das propriedades">Versão, rotas, capabilities e integrações são lidas do manifest registrado.</InfoHint></h3>
        <dl className="hub-inspector-properties">
          <div><dt>Versão</dt><dd>v{node.version}</dd></div>
          <div><dt>Readiness</dt><dd>{node.readinessScore === undefined ? "Sem leitura" : `${node.readinessScore}%`}</dd></div>
          <div><dt>Última leitura</dt><dd>{formatMoment(node.lastCheckAt)}</dd></div>
          <div><dt>Capabilities</dt><dd>{node.capabilitiesCount}</dd></div>
          <div><dt>Rotas</dt><dd>{node.routesCount}</dd></div>
          <div id="hub-node-integrations"><dt>Integrações</dt><dd>{node.integrationsCount}</dd></div>
        </dl>
      </section>
      <section id="hub-node-origin">
        <h3>Fontes</h3>
        <ul className="hub-inspector-sources">
          <li><StatusMark status="available" /> Manifest <small>Registry · processo</small></li>
          <li><StatusMark status={node.lastCheckAt ? "available" : "unknown"} /> Saúde <small>{node.lastCheckAt ? "Snapshot institucional" : "Sem leitura institucional"}</small></li>
        </ul>
      </section>
      <section className="hub-inspector-next" data-status={next?.status ?? node.status}>
        <span><HubIcon name="activity" size={20} /></span>
        <div><small>Próxima ação real</small><strong>{next?.label ?? `Abrir ${node.label}`}</strong><small>{next?.technicalLabel ?? "Registry"}</small></div>
        <Link href={next?.href ?? node.href}>Abrir contexto</Link>
      </section>
    </aside>
  )
}

function OverviewDeck({ viewModel, expanded, onToggle }: { readonly viewModel: HubOverviewVM; readonly expanded: boolean; readonly onToggle: () => void }) {
  return (
    <section className="hub-overview-deck" data-expanded={expanded} aria-label="Atividade e fontes operacionais">
      <header><h2>Linha operacional</h2><button aria-expanded={expanded} onClick={onToggle} type="button"><HubIcon name={expanded ? "minimize" : "expand"} size={16} />{expanded ? "Compactar" : "Expandir"}</button></header>
      <div className="hub-overview-deck__grid">
        <section className="hub-source-flow"><h3>Fluxo das fontes</h3><ol>{viewModel.origins.map((origin, index) => <li key={origin.id}><StatusMark status={origin.status} /><span><strong>{origin.label}</strong><small>{origin.persistence}</small></span>{index < viewModel.origins.length - 1 ? <HubIcon name="chevron" size={16} /> : null}</li>)}</ol></section>
        <section><h3>Atividade da sessão <Link href="/events">Ver eventos</Link></h3>{viewModel.activity.items.length ? <ol className="hub-deck-list">{viewModel.activity.items.slice(0, expanded ? 8 : 4).map((item) => <li key={`${item.kind}:${item.id}`}><StatusMark status={item.status} /><time>{formatMoment(item.occurredAt)}</time><strong>{item.source}</strong><span>{item.label}</span></li>)}</ol> : <span className="hub-empty-line">Nenhum sinal nesta sessão</span>}</section>
        <section><h3>Requer atenção <Link href="/projects">Ver projetos</Link></h3>{viewModel.attention.length ? <ol className="hub-deck-list">{viewModel.attention.slice(0, expanded ? 8 : 4).map((item) => <li key={item.id}><StatusMark status={item.status} /><strong>{item.label}</strong><span>{item.statusLabel}</span><Link href={item.href}><HubIcon name="chevron" size={16} /></Link></li>)}</ol> : <span className="hub-empty-line">Nenhuma leitura crítica</span>}</section>
        <section><h3>Mudanças registradas <Link href="/roadmap">Ver evolução</Link></h3>{viewModel.changes.length ? <ol className="hub-deck-list">{viewModel.changes.slice(0, expanded ? 8 : 4).map((item) => <li key={item.id}><StatusMark status={item.status} /><time>{formatMoment(item.occurredAt)}</time><strong>{item.actor}</strong><span>{item.label}</span></li>)}</ol> : <span className="hub-empty-line">Nenhuma mudança em .matriz/activity</span>}<div className="hub-recent-actors" aria-label="Atores recentes no histórico">{viewModel.actors.slice(0, 3).map((actor) => <span key={actor.id}><HubIcon name="user" size={16} />{actor.label}<small>{actor.activityCount} registros · histórico</small></span>)}</div></section>
      </div>
    </section>
  )
}

export function OverviewSpatialWorkspace({ viewModel }: { readonly viewModel: HubOverviewVM }) {
  const [selectedId, setSelectedId] = React.useState(viewModel.graph.defaultSelectedId)
  const [mode, setMode] = React.useState<OverviewVisualMode>("auto")
  const [detail, setDetail] = React.useState<DetailLevel>("operation")
  const [webgl, setWebgl] = React.useState(false)
  const [desktop, setDesktop] = React.useState(false)
  const [expanded, setExpanded] = React.useState(false)
  const [deckExpanded, setDeckExpanded] = React.useState(false)
  const [zoom, setZoom] = React.useState(1)

  React.useEffect(() => {
    setMode(parseOverviewVisualMode(window.localStorage.getItem(OVERVIEW_VISUAL_MODE_KEY)))
    setWebgl(canUseWebGL())
    const query = window.matchMedia("(min-width: 1100px)")
    const update = () => setDesktop(query.matches)
    update(); query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  React.useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setExpanded(false); setDeckExpanded(false) } }
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [])

  const show3d = webgl && (mode === "3d" || (mode === "auto" && desktop))
  const selected = viewModel.graph.nodes.find((node) => node.id === selectedId) ?? viewModel.graph.nodes[0]
  function chooseMode(next: OverviewVisualMode) { setMode(next); window.localStorage.setItem(OVERVIEW_VISUAL_MODE_KEY, next) }

  return (
    <div className="hub-spatial-workspace" data-expanded={expanded} data-detail={detail}>
      <div className="hub-spatial-breadcrumb"><span>Você está aqui:</span><Link href="/">Matriz Core</Link><HubIcon name="chevron" size={16} /><span>Arquitetura</span><HubIcon name="chevron" size={16} /><strong>{selected?.label ?? "Visão geral"}</strong><StatusMark status={selected?.status ?? "unknown"} /></div>
      <section className="hub-spatial-map-shell" aria-label="Mapa operacional do ecossistema">
        <header className="hub-map-toolbar">
          <div><strong>Camadas</strong><button aria-label="Integrações" data-active type="button"><HubIcon name="graph" size={16} /></button><button aria-label="Saúde" type="button"><HubIcon name="health" size={16} /></button><button aria-label="Eventos" type="button"><HubIcon name="event" size={16} /></button></div>
          <div className="hub-view-controls" aria-label="Controles do mapa">
            <label>Nível <select onChange={(event) => setDetail(event.target.value as DetailLevel)} value={detail}><option value="summary">Resumo</option><option value="operation">Operação</option><option value="detail">Detalhe</option></select></label>
            {(["auto", "3d", "2d"] as const).map((item) => <button aria-pressed={mode === item} key={item} onClick={() => chooseMode(item)} type="button">{item === "3d" ? <HubIcon name="cube" size={16} /> : item === "2d" ? <HubIcon name="map2d" size={16} /> : null}{item === "auto" ? "Auto" : item.toUpperCase()}</button>)}
            <button aria-label="Diminuir zoom" onClick={() => setZoom((value) => Math.max(.8, value - .1))} type="button"><HubIcon name="zoomOut" size={16} /></button>
            <button aria-label="Aumentar zoom" onClick={() => setZoom((value) => Math.min(1.4, value + .1))} type="button"><HubIcon name="zoomIn" size={16} /></button>
            <button aria-label="Enquadrar tudo" onClick={() => setZoom(1)} type="button"><HubIcon name="fit" size={16} /></button>
            <button aria-label={expanded ? "Voltar ao panorama" : "Expandir mapa"} onClick={() => setExpanded((value) => !value)} type="button"><HubIcon name={expanded ? "minimize" : "expand"} size={16} /></button>
          </div>
        </header>
        <div className="hub-map-stage">
          <div className="hub-map-viewport" style={{ transform: `scale(${zoom})` }}>{show3d ? <OverviewScene3D edges={viewModel.graph.edges} nodes={viewModel.graph.nodes} onSelect={setSelectedId} selectedId={selected?.id} /> : <OverviewMapFallback edges={viewModel.graph.edges} nodes={viewModel.graph.nodes} onSelect={setSelectedId} selectedId={selected?.id} />}</div>
          {mode === "3d" && !webgl ? <div className="hub-map-notice"><HubIcon name="warning" size={16} /> WebGL indisponível · exibindo mapa 2D</div> : null}
          <aside className="hub-map-minimap" aria-label="Resumo do mapa"><strong>Mapa do sistema</strong><svg viewBox="0 0 100 55"><rect height="45" width="70" x="15" y="5" /><circle cx="50" cy="27" r="4" />{viewModel.graph.nodes.slice(0, 7).map((node, index) => <circle cx={20 + (index % 4) * 20} cy={12 + Math.floor(index / 4) * 28} key={node.id} r="2" />)}</svg></aside>
          <aside className="hub-map-legend"><strong>Legenda</strong>{(["running", "attention", "complete", "unknown"] as const).map((status) => <span key={status}><StatusMark status={status} />{status === "running" ? "Em execução" : status === "attention" ? "Atenção" : status === "complete" ? "Saudável" : "Sem leitura"}</span>)}</aside>
        </div>
      </section>
      <Inspector node={selected} viewModel={viewModel} />
      <OverviewDeck expanded={deckExpanded} onToggle={() => setDeckExpanded((value) => !value)} viewModel={viewModel} />
    </div>
  )
}
