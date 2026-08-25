import { listAuthorizedCompanies } from "../src/application/company-access"
import { resolveCompanyPageFoundation } from "../src/auth/server-page-context"
import { CompanyEntry } from "../src/ui/CompanyEntry"
import { toCompanyChoiceViewModel } from "../src/ui/presenters/company.presenter"

export default async function HomePage() {
  const foundation = await resolveCompanyPageFoundation()
  if (foundation.kind === "unavailable") return <CompanyEntry initialCompanies={[]} availability="unavailable" />
  try {
    const user = await foundation.services.core.resolveUser(foundation.actor)
    const companies = await listAuthorizedCompanies(user.id, foundation.services.core, foundation.services.companies)
    return <CompanyEntry initialCompanies={companies.map(toCompanyChoiceViewModel)} />
  } catch {
    return <CompanyEntry initialCompanies={[]} availability="unavailable" />
  }
}
