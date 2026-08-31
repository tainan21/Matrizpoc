import type { ClientAdminDashboard, ClientAdminIntegration, ClientAdminPayment, ClientAdminSystem } from "@matriz/integration-api-contracts"
import { presentDashboard } from "../presentation/dashboard-presenter"
import { Icon } from "./icons"

type SectionName = "overview" | "systems" | "site" | "payments" | "integrations"
const titles: Record<SectionName, string> = { overview: "Visão geral", systems: "Sistemas", site: "Site e analytics", payments: "Pagamentos", integrations: "Integrações" }
const paths: Record<SectionName, string> = { overview: "/", systems: "/systems", site: "/site", payments: "/payments", integrations: "/integrations" }

function State({ state }: { state: string }) { return <span className={`state state-${state}`}><span className="state-dot"/>{({ fresh: "Atualizado", stale: "Dados antigos", empty: "Sem registros", not_configured: "Não configurado", unavailable: "Indisponível", error: "Erro" } as Record<string,string>)[state] ?? state}</span> }
function Empty({ message }: { message: string }) { return <div className="empty"><span className="empty-symbol" aria-hidden="true">◇</span><p>{message}</p></div> }

export function DashboardView({ dashboard, section }: { dashboard: ClientAdminDashboard; section: SectionName }) {
  const view = presentDashboard(dashboard)
  const target = section === "overview" ? null : dashboard.sections[section]
  return <>
    <header className="page-header"><div><span className="eyebrow">{dashboard.tenant.name} · Produção</span><h1>{titles[section]}</h1></div><button className="icon-button" type="button" aria-label="Atualizar dados" title="Atualizar dados" onClick={async () => { await fetch("/api/refresh", { method: "POST" }).catch(() => undefined); window.location.reload() }}><Icon name="refresh"/></button></header>
    {section === "overview" ? <Overview dashboard={dashboard} /> : section === "systems" ? <Systems data={(target?.data as ClientAdminSystem[]) ?? []} state={target!.state}/> : section === "payments" ? <Payments data={(target?.data as ClientAdminPayment[]) ?? []} state={target!.state}/> : section === "integrations" ? <Integrations data={(target?.data as ClientAdminIntegration[]) ?? []} state={target!.state}/> : <Site dashboard={dashboard}/>}
    <p className="updated-note">{view.statusLabel} · última leitura {new Date(dashboard.generatedAt).toLocaleString("pt-BR")}</p>
  </>
}

function Overview({ dashboard }: { dashboard: ClientAdminDashboard }) {
  const view = presentDashboard(dashboard)
  return <div className="overview-flow">
    <section className="health-line" aria-live="polite"><span className={view.statusLabel === "Tudo verificado" ? "health-orb healthy" : "health-orb"}/><div><strong>{view.statusLabel}</strong><span>Acompanhe apenas o que conseguimos verificar com segurança.</span></div></section>
    {dashboard.metrics.length > 0 && <section><h2>Dashboard e métricas</h2><div className="metric-strip">{dashboard.metrics.map((metric) => <div key={metric.id} className="metric"><span>{metric.label}</span><strong>{metric.value ?? "Sem dados"}</strong><small>{metric.unit ?? ""}</small></div>)}</div></section>}
    <section><h2>Precisa de atenção</h2>{dashboard.attention.length ? <div className="data-list">{dashboard.attention.map((item) => <a key={item.id} className="data-row" href={item.href}><Icon name="alert"/><span><strong>{item.title}</strong><small>{item.detail}</small></span><span className={`severity ${item.severity}`}>{item.severity}</span></a>)}</div> : <Empty message="Nada exige atenção neste momento."/>}</section>
    <section><h2>Resumo das áreas</h2><div className="area-grid">{Object.entries(view.sections).map(([key, value]) => <a key={key} href={paths[key as SectionName]} className="area-link"><span>{titles[key as SectionName]}</span><strong>{value.valueLabel}</strong><State state={value.state}/></a>)}</div></section>
  </div>
}
function Systems({ data, state }: { data: ClientAdminSystem[]; state: string }) { return <section><div className="section-status"><State state={state}/></div>{data.length ? <div className="data-list">{data.map((item) => <div className="data-row" key={item.id}><Icon name="systems"/><span><strong>{item.name}</strong><small>{item.purpose || "Finalidade ainda não informada"}</small></span><State state={item.availability}/></div>)}</div> : <Empty message="Os sistemas deste cliente aparecerão aqui quando forem cadastrados."/>}</section> }
function Payments({ data, state }: { data: ClientAdminPayment[]; state: string }) { return <section><div className="section-status"><State state={state}/></div>{data.length ? <div className="data-list">{data.map((item) => <div className="data-row" key={item.id}><Icon name="payments"/><span><strong>{item.description}</strong><small>Vencimento {new Date(item.dueAt).toLocaleDateString("pt-BR")}</small></span><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: item.currency }).format(item.amountCents / 100)}</strong></div>)}</div> : <Empty message="Nenhum pagamento foi projetado para esta visão."/>}</section> }
function Integrations({ data, state }: { data: ClientAdminIntegration[]; state: string }) { return <section><div className="section-status"><State state={state}/></div><div className="data-list">{data.map((item) => <div className="data-row" key={item.id}><Icon name="integrations"/><span><strong>{item.label}</strong><small>{item.lastSuccessAt ? `Último sucesso ${new Date(item.lastSuccessAt).toLocaleString("pt-BR")}` : "Aguardando configuração de ambiente"}</small></span><State state={item.state}/></div>)}</div></section> }
function Site({ dashboard }: { dashboard: ClientAdminDashboard }) { const value = dashboard.sections.site; return <section><div className="section-status"><State state={value.state}/></div><Empty message={value.state === "not_configured" ? "Configure o site e o GA4 para começar a acompanhar saúde e acessos." : "As métricas do site ainda não estão disponíveis."}/></section> }
