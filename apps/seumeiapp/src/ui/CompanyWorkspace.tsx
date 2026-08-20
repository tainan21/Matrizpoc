import Link from "next/link"
import type { WorkspaceViewModel } from "./presenters/company.presenter"

export function CompanyWorkspace({ workspace }: { readonly workspace: WorkspaceViewModel }) {
  return <main className="workspace-page"><header className="workspace-header"><a href="/" className="brand-lockup"><span className="brand-mark">S</span><strong>SEUMEI</strong></a><Link href="/">Trocar empresa</Link></header><section className="workspace-title"><span className="eyebrow">WORKSPACE DA EMPRESA</span><h1>{workspace.companyName}</h1><p><span>{workspace.operationLabel}</span><span>{workspace.locationLabel}</span></p></section><section className="workspace-foundation"><div><span className="foundation-index">01</span><h2>Empresa pronta.</h2></div><p>Identidade, operação e preferências estão persistidas. Esta é a fundação autorizada para as próximas capacidades da Seumei.</p></section></main>
}
