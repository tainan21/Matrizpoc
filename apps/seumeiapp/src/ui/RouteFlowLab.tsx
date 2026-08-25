"use client"
import { useMemo, useState } from "react"
import { CANONICAL_ROUTE_FLOWS, parseRouteFlow, routeFlowToMarkdown } from "../domain/route-flow"
const INITIAL = "/login — autenticar\n/ — selecionar empresa\n/onboarding — configurar\n/workspace — operar"
export function RouteFlowLab() {
  const [source, setSource] = useState(INITIAL); const [copied, setCopied] = useState(false)
  const parsed = useMemo(() => parseRouteFlow(source), [source])
  async function copyMarkdown() { if (parsed.kind !== "valid") return; await navigator.clipboard?.writeText(routeFlowToMarkdown("Novo route flow", parsed.steps)); setCopied(true) }
  return <main className="route-flow-page">
    <header className="route-flow-hero"><div><span className="eyebrow">LABORATÓRIO TEMPORÁRIO</span><h1>Route flows</h1></div><a href="/workspace">Voltar ao workspace</a><p>Rotas reais, resultados esperados e um quadro simples para desenhar o próximo fluxo.</p></header>
    <section className="route-flow-list" aria-label="Flows implementados">{CANONICAL_ROUTE_FLOWS.map((flow) => <article className="route-flow-card" key={flow.id}><span className="eyebrow">FLOW CANÔNICO</span><h2>{flow.title}</h2><p>{flow.description}</p><ol>{flow.steps.map((step) => <li key={`${flow.id}-${step.route}`}><code>{step.route}</code><span aria-hidden="true">→</span><strong>{step.outcome}</strong></li>)}</ol></article>)}</section>
    <section className="route-flow-drawer"><div><span className="eyebrow">RASCUNHO LOCAL</span><h2>Desenhar rota</h2><p>Uma linha por passo: <code>/rota — resultado</code>. Este conteúdo não concede acesso nem vira dado empresarial.</p></div><label htmlFor="route-flow-source">Passos da rota</label><textarea id="route-flow-source" value={source} onChange={(event) => { setSource(event.target.value); setCopied(false) }} rows={8} />
      {parsed.kind === "invalid" ? <p role="alert">Linha {parsed.line}: {parsed.message}</p> : <div className="route-flow-preview"><ol>{parsed.steps.map((step, index) => <li key={`${step.route}-${index}`}><code>{step.route}</code><span>→</span><strong>{step.outcome}</strong></li>)}</ol><button type="button" onClick={copyMarkdown}>{copied ? "Markdown copiado" : "Copiar Markdown"}</button></div>}
    </section>
  </main>
}
