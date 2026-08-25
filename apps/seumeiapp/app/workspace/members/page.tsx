import { redirect } from "next/navigation"
import { MembershipCapabilityDeniedError, readCompanyMembers } from "../../../src/application/company-memberships"
import { CompanyAccessDeniedError } from "../../../src/application/company-access"
import { requireWorkspaceCompany, WorkspaceNotReadyError } from "../../../src/application/company-onboarding"
import { resolveActiveCompanyContext } from "../../../src/application/active-company"
import { resolveCompanyPageFoundation } from "../../../src/auth/server-page-context"
import { CompanyMembers } from "../../../src/ui/CompanyMembers"
import { SystemState } from "../../../src/ui/SystemState"
import { toMemberDirectoryViewModel } from "../../../src/ui/presenters/membership.presenter"

export default async function MembersPage() {
  const foundation = await resolveCompanyPageFoundation()
  if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />
  if (!foundation.preferredCompanyId) redirect("/")
  try {
    const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies)
    await requireWorkspaceCompany(context, foundation.services.companies)
    const directory = await readCompanyMembers(context, foundation.services.core)
    return <CompanyMembers directory={toMemberDirectoryViewModel(context, directory)} />
  } catch (error) {
    if (error instanceof WorkspaceNotReadyError) redirect("/onboarding")
    if (error instanceof CompanyAccessDeniedError || error instanceof MembershipCapabilityDeniedError) return <SystemState kind="forbidden" />
    return <SystemState kind="unavailable" />
  }
}
