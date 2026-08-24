"use client"

import * as React from "react"
import Link from "next/link"
import type { CompanyId } from "../../companies/domain/company"
import { useSeumeiTenant } from "../../memberships/presentation/use-seumei-tenant"

export function CompanyWorkspaceScreen({ companySlug, appId }: { readonly companySlug: string; readonly appId?: string }) {
  const tenant = useSeumeiTenant()
  const requestedCompany = tenant.hub?.companies.find((company) => company.slug === companySlug)

  React.useEffect(() => {
    if (requestedCompany && tenant.current?.company.slug !== requestedCompany.slug) {
      void tenant.switchCompany(requestedCompany.id as CompanyId)
    }
  }, [requestedCompany, tenant])

  if (tenant.status === "loading") return <div className="seumei-state">Validando acesso…</div>
  if (!requestedCompany) return <UnavailableState message="Empresa não disponível para esta conta." />
  if (!tenant.current || tenant.current.company.slug !== requestedCompany.slug) return <div className="seumei-state">Abrindo {requestedCompany.name}…</div>

  const activeApp = appId ? tenant.current.company.apps.find((app) => app.id === appId) : null
  if (appId && !activeApp) return <UnavailableState message="Aplicativo não instalado ou sem permissão." />

  return (
    <div className="seumei-workspace-overview">
      <span className="seumei-eyebrow">{tenant.current.company.name}</span>
      <h1>{activeApp?.name ?? "Visão operacional"}</h1>
      <p>{activeApp?.description ?? "Escolha uma capacidade instalada para iniciar o trabalho."}</p>
      <div className="seumei-workspace-apps">
        {tenant.current.company.apps.map((app) => (
          <Link href={app.href} key={app.id}><span>{appIcon(app.icon)}</span><strong>{app.name}</strong><small>{app.description}</small></Link>
        ))}
      </div>
    </div>
  )
}

function UnavailableState({ message }: { readonly message: string }) {
  return <section className="seumei-empty-state"><span aria-hidden="true">⊘</span><h1>Acesso indisponível</h1><p>{message}</p><Link href="/hub">Voltar ao Hub</Link></section>
}

function appIcon(icon: string) {
  return ({ dashboard: "⌂", users: "◎", package: "◇", receipt: "▤", boxes: "▦", wallet: "$", store: "▱", chart: "⌁" } as Record<string, string>)[icon] ?? "✦"
}
