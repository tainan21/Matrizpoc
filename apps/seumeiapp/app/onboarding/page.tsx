import { redirect } from "next/navigation"
import { CompanyAccessDeniedError } from "../../src/application/company-access"
import { readCompanyOnboarding } from "../../src/application/company-onboarding"
import { resolveActiveCompanyContext } from "../../src/auth/active-company"
import { resolveCompanyPageFoundation } from "../../src/auth/server-page-context"
import { CompanyOnboarding } from "../../src/ui/CompanyOnboarding"
import { SystemState } from "../../src/ui/SystemState"
import { toOnboardingViewModel } from "../../src/ui/presenters/company.presenter"

export default async function OnboardingPage() {
  const foundation = await resolveCompanyPageFoundation()
  if (foundation.kind === "unavailable") return <SystemState kind="unavailable" />
  if (!foundation.preferredCompanyId) redirect("/")
  try {
    const context = await resolveActiveCompanyContext(foundation.actor, foundation.preferredCompanyId, foundation.services.core, foundation.services.companies)
    const onboarding = await readCompanyOnboarding(context, foundation.services.companies)
    if (onboarding.currentStep !== "COMPLETED") {
      return <CompanyOnboarding onboarding={toOnboardingViewModel(context.company, onboarding)} />
    }
  } catch (error) {
    if (error instanceof CompanyAccessDeniedError) return <SystemState kind="forbidden" />
    return <SystemState kind="unavailable" />
  }
  redirect("/workspace")
}
