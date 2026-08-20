import { redirect } from "next/navigation"
import { CompanyAccessDeniedError } from "../../src/application/company-access"
import { requireWorkspaceCompany, WorkspaceNotReadyError } from "../../src/application/company-onboarding"
import { resolveActiveCompanyContext } from "../../src/application/active-company"
import { resolveCompanyPageFoundation } from "../../src/auth/server-page-context"
import { CompanyWorkspace } from "../../src/ui/CompanyWorkspace"
import { SystemState } from "../../src/ui/SystemState"
import { toWorkspaceViewModel } from "../../src/ui/presenters/company.presenter"

export default async function WorkspacePage() {
  const foundation = await resolveCompanyPageFoundation()
  if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />
  if (!foundation.preferredCompanyId) redirect("/")
  try {
    const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies)
    const company = await requireWorkspaceCompany(context, foundation.services.companies)
    return <CompanyWorkspace workspace={toWorkspaceViewModel(company)} />
  } catch (error) {
    if (error instanceof WorkspaceNotReadyError) redirect("/onboarding")
    if (error instanceof CompanyAccessDeniedError) return <SystemState kind="forbidden" />
    return <SystemState kind="unavailable" />
  }
}
