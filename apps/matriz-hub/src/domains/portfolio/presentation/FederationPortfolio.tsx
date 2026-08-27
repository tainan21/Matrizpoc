import Link from "next/link"
import type { FederationPortfolioViewModel } from "./portfolio-presenter"

export function FederationPortfolio({ viewModel, seumeiOrigin }: { readonly viewModel: FederationPortfolioViewModel; readonly seumeiOrigin: string }) {
  return (
    <main className="federation" data-experience="federation-v1">
      <header className="federation__topbar">
        <div><span className="federation__brand">MyHub</span><span className="federation__brand-sub">FEDERAÇÃO</span></div>
        <div className="federation__account"><span>Conta global de demonstração</span><strong>DEMO</strong></div>
        <time>{viewModel.generatedAtLabel}</time>
      </header>

      <section className="federation__body">
        <div className="federation__primary">
          <div className="federation__intro">
            <div><p className="federation__eyebrow">PORTFÓLIO AUTORIZADO</p><h1>Bem-vindo ao MyHub Federação</h1><p>Acesse suas empresas por uma identidade global, com isolamento preservado em cada produto.</p></div>
            <a className="federation__secondary-action" href={seumeiOrigin}>Criar empresa</a>
          </div>

          <dl className="federation__summary">
            {viewModel.summary.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
          </dl>

          <div className="federation__section-heading"><div><h2>Empresas disponíveis</h2><p>Somente memberships válidas para esta conta aparecem aqui.</p></div></div>
          {viewModel.companies.length === 0 ? (
            <section className="federation__empty"><h2>Nenhuma empresa autorizada</h2><p>Crie uma empresa na Seumei ou aceite um convite para começar.</p><a href={seumeiOrigin}>Abrir Seumei</a></section>
          ) : (
            <div className="federation__companies">
              {viewModel.companies.map((company) => (
                <article className="federation__company" key={company.id}>
                  <div className="federation__company-name"><span aria-hidden="true">{company.name.slice(0, 1)}</span><div><h3>{company.name}</h3><p>{company.roleLabel} · {company.statusLabel}</p><small>{company.slug}</small></div></div>
                  <dl><div><dt>Receita hoje</dt><dd>{company.revenue}</dd></div><div><dt>Pedidos em operação</dt><dd>{company.liveOrders}</dd></div><div><dt>Estoque baixo</dt><dd>{company.lowStock}</dd></div></dl>
                  <a className="federation__primary-action" href={company.href}>Abrir empresa</a>
                </article>
              ))}
            </div>
          )}
          <p className="federation__notice">Ambiente de demonstração isolado. Pagamentos e integrações externas não representam operações reais.</p>
        </div>

        <aside className="federation__apps" aria-label="Apps disponíveis">
          <p className="federation__eyebrow">APPS PÚBLICOS</p><h2>Superfícies conectadas</h2><p>Contratos já disponíveis para esta demonstração.</p>
          <a href={seumeiOrigin}><strong>Seumei</strong><span>Empresas e operação</span></a>
          <Link href="/ecosystem"><strong>Ecossistema</strong><span>Saúde e catálogo Matriz</span></Link>
          <Link href="/docs"><strong>Matriz Docs</strong><span>Conhecimento conectado</span></Link>
        </aside>
      </section>
    </main>
  )
}

export function FederationUnavailable() {
  return <main className="federation federation--state"><p className="federation__eyebrow">MYHUB FEDERAÇÃO</p><h1>Portfólio temporariamente indisponível</h1><p>A sessão continua segura. Tente novamente quando a Seumei estiver acessível.</p><Link href="/">Tentar novamente</Link></main>
}
