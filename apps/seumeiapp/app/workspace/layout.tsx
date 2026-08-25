import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { CompanyAccessDeniedError } from "../../src/application/company-access"
import { requireWorkspaceCompany, WorkspaceNotReadyError } from "../../src/application/company-onboarding"
import { resolveActiveCompanyContext } from "../../src/application/active-company"
import { resolveCompanyPageFoundation } from "../../src/auth/server-page-context"
import { CompanyWorkspaceShell } from "../../src/ui/CompanyWorkspaceShell"
import { SystemState } from "../../src/ui/SystemState"
import { toWorkspaceShellViewModel } from "../../src/ui/presenters/workspace-shell.presenter"

export default async function WorkspaceLayout({ children }: { readonly children: ReactNode }) {
  const foundation = await resolveCompanyPageFoundation()
  if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />
  if (!foundation.preferredCompanyId) redirect("/")
  try {
    const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies)
    const company = await requireWorkspaceCompany(context, foundation.services.companies)
    return <CompanyWorkspaceShell shell={toWorkspaceShellViewModel(company, context.role)}>{children}</CompanyWorkspaceShell>
  } catch (error) {
    if (error instanceof WorkspaceNotReadyError) redirect("/onboarding")
    if (error instanceof CompanyAccessDeniedError) return <SystemState kind="forbidden" />
    return <SystemState kind="unavailable" />
  }
}
