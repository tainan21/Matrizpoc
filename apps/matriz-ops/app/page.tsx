import Link from "next/link"
import { redirect } from "next/navigation"
import { loadOpsOverview } from "../src/application/user-directory"
import { loadOperationalPulse } from "../src/application/operational-pulse"
import { requireOpsPagePrincipal } from "../src/server/ops-session"
import { localE2eBootstrapPath } from "../src/server/local-e2e-bootstrap"
import { AppShell } from "../src/ui/AppShell"
export const dynamic = "force-dynamic"
function number(value: number | string | bigint) { return new Intl.NumberFormat("pt-BR").format(typeof value === "number" ? value : BigInt(value)) }
function money(value: string) { const amount = BigInt(value); return `R$ ${number(amount / 100n)},${(amount % 100n).toString().padStart(2, "0")}` }
function since(value: string | null) { if (!value) return "sem sinal"; const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000)); return seconds < 60 ? `${seconds}s` : seconds < 3600 ? `${Math.round(seconds / 60)}min` : `${Math.round(seconds / 3600)}h` }
export default async function Overview() {
  const principal = await requireOpsPagePrincipal()
  if (!principal) {
    const bootstrapPath = localE2eBootstrapPath({
      MATRIZ_RUNTIME_PROFILE: process.env.MATRIZ_RUNTIME_PROFILE,
      OPS_E2E_ENABLED: process.env.OPS_E2E_ENABLED,
      OPS_E2E_SESSION_TOKEN: process.env.OPS_E2E_SESSION_TOKEN,
    })
    if (bootstrapPath) redirect(bootstrapPath)
    return <div className="access-card"><h1>Matriz Ops</h1><p>Entre pelo Matriz Identity com uma conta que possua papel global de operador. Nenhum dado administrativo é carregado antes da validação da sessão.</p></div>
  }
  const [identity, pulse] = await Promise.all([loadOpsOverview(), loadOperationalPulse()])
  const metrics = [["Usuários", identity.users, "base registrada"], ["Ativos", identity.activeUsers, "identidades liberadas"], ["Suspensos", identity.suspendedUsers, "acesso bloqueado"], ["Sessões", identity.activeSessions, "sessões válidas"], ["Operadores", identity.operators, "equipe interna"], ["Plataformas", identity.platforms, "registros ativos"]] as const
  const critical = pulse.services.filter((service) => service.status === "critical")
  return <AppShell><section className="pulse-intro"><div><small>PULSO DA OPERAÇÃO</small><h2>Bom trabalho, {principal.session.user.displayName}.</h2><p>Identidade, serviços e movimentos financeiros lidos diretamente das fontes operacionais.</p></div><span className="live-source">● Dados reais · atualizado {since(pulse.updatedAt)}</span></section>
    <section className="metric-grid compact">{metrics.map(([label, value, detail]) => <article className="metric" key={label}><span>{label}</span><strong>{number(value)}</strong><small>{detail}</small></article>)}</section>
    <section className="section-head"><div><h2>Saúde operacional</h2><p>Sinais consolidados e disponibilidade das dependências</p></div><Link href="/platforms">Ver plataformas →</Link></section>
    <section className="health-strip">{pulse.services.map((service) => <article key={service.id}><span className={`health-dot ${service.status}`} /><div><strong>{service.label}</strong><small>{service.detail}</small></div><b className={service.status}>{service.status === "normal" ? "Normal" : service.status === "warning" ? "Atenção" : "Crítico"}</b></article>)}</section>
    <section className="ops-columns"><article className="panel flush"><div className="panel-title"><div><h2>Atividade operacional</h2><p>Últimas ações administrativas auditadas</p></div><Link href="/audit">Auditoria →</Link></div><div className="activity-list">{pulse.audit.length ? pulse.audit.map((event) => <div key={event.id}><span className="activity-mark"/><div><strong>{event.action}</strong><p>{event.targetType} · {event.reason}</p></div><time>{new Date(event.occurredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></div>) : <p className="empty-state">Nenhuma mutação auditada até agora.</p>}</div></article>
      <aside className="summary-stack">{critical.length > 0 && <section className="attention-card"><strong>Atenção requerida</strong><p>{critical.map((item) => item.label).join(", ")} {critical.length === 1 ? "precisa" : "precisam"} de revisão.</p><Link href="/finance">Revisar operação →</Link></section>}<section className="panel summary-card"><div><h2>Wallets & telemetria</h2><p>Consolidação persistente</p></div><dl><div><dt>Saldo MTRZ</dt><dd>{number(pulse.pay.balances.MTRZ)}</dd></div><div><dt>Saldo BRL</dt><dd>{money(pulse.pay.balances.BRL)}</dd></div><div><dt>Eventos 7d</dt><dd>{number(pulse.telemetry.events7d)}</dd></div><div><dt>Erros 7d</dt><dd>{number(pulse.telemetry.errors7d)}</dd></div></dl><small>Último sinal: {since(pulse.telemetry.lastSignalAt)}</small><Link href="/telemetry">Explorar telemetria →</Link></section></aside>
    </section></AppShell>
}
