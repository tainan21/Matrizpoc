import type { WorkspaceViewModel } from "./presenters/company.presenter"

export function CompanyWorkspace({ workspace }: { readonly workspace: WorkspaceViewModel }) {
  return <main className="workspace-page workspace-overview"><section className="workspace-title"><span className="eyebrow">VISÃO GERAL</span><h1>{workspace.companyName}</h1><p><span>{workspace.operationLabel}</span><span>{workspace.locationLabel}</span></p></section><section className="workspace-foundation"><div><span className="foundation-index">01</span><h2>Empresa pronta.</h2></div><p>Identidade, operação, acesso e preferências estão persistidos. O workspace usa a membership resolvida no servidor a cada entrada.</p></section></main>
}
