"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@matriz/platform-auth/client"
import type { CompanyId } from "../../companies/domain/company"
import { useSeumeiTenant } from "../../memberships/presentation/use-seumei-tenant"

export function HubScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const tenant = useSeumeiTenant()

  async function openCompany(companyId: CompanyId, href: string) {
    if (await tenant.switchCompany(companyId)) router.push(href)
  }

  if (tenant.status === "loading") {
    return <div className="seumei-state">Preparando seu ambiente…</div>
  }

  if (!tenant.hub || tenant.status === "empty") {
    return (
      <section className="seumei-empty-state">
        <span aria-hidden="true">✦</span>
        <h1>{tenant.hub?.emptyState?.title ?? "Nenhuma empresa disponível"}</h1>
        <p>{tenant.hub?.emptyState?.description ?? "Esta conta ainda não possui acesso operacional no Seumei."}</p>
        <a href="/login">Usar a conta demo</a>
      </section>
    )
  }

  const uniqueApps = tenant.hub.companies
    .flatMap((company) => company.apps)
    .filter((app, index, all) => all.findIndex((candidate) => candidate.id === app.id) === index)

  return (
    <div className="seumei-hub">
      <section className="seumei-hub__intro">
        <div>
          <span className="seumei-eyebrow">Business OS</span>
          <h1>Bem-vindo, {session?.identity.user.name ?? "Tai"} <span aria-hidden="true">👋</span></h1>
          <p>Escolha uma empresa para continuar sua operação.</p>
        </div>
        <button type="button" className="seumei-primary-action"><span aria-hidden="true">＋</span> Nova empresa</button>
      </section>

      {tenant.error ? <div className="seumei-inline-alert" role="alert">{tenant.error}</div> : null}

      <section aria-labelledby="companies-title">
        <div className="seumei-section-heading">
          <div><h2 id="companies-title">Suas empresas</h2><p>Memberships ativas para esta conta.</p></div>
          <span>{tenant.hub.companies.length} empresas</span>
        </div>
        <div className="seumei-company-grid">
          {tenant.hub.companies.map((company) => (
            <article className="seumei-company-card" key={company.id} style={{ "--company-accent": company.accent } as React.CSSProperties}>
              <div className="seumei-company-card__cover">
                <img src={company.coverUrl} alt="" />
                <span className="seumei-company-status">{company.statusLabel}</span>
              </div>
              <div className="seumei-company-card__body">
                <div className="seumei-company-identity">
                  <img src={company.logoUrl} alt="" />
                  <div><h3>{company.name}</h3><p>{company.segment} · {company.roleLabel}</p></div>
                </div>
                <div className="seumei-company-card__meta"><span>{company.appCountLabel}</span><span>{company.slug}.seumei.local</span></div>
                <button type="button" onClick={() => void openCompany(company.id as CompanyId, company.href)}>Acessar empresa <span aria-hidden="true">→</span></button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="apps-title" className="seumei-apps-section">
        <div className="seumei-section-heading"><div><h2 id="apps-title">Aplicativos disponíveis</h2><p>Capacidades instaladas nas suas empresas.</p></div></div>
        <div className="seumei-app-grid">
          {uniqueApps.map((app) => (
            <div className="seumei-app-tile" key={app.id}>
              <span className="seumei-app-icon" aria-hidden="true">{appIcon(app.icon)}</span>
              <div><strong>{app.name}</strong><span>{app.description}</span></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function appIcon(icon: string) {
  return ({ dashboard: "⌂", users: "◎", package: "◇", receipt: "▤", boxes: "▦", wallet: "$", store: "▱", chart: "⌁" } as Record<string, string>)[icon] ?? "✦"
}
