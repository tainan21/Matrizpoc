import { CompanyWorkspaceScreen } from "../../../src/domains/hub/presentation/CompanyWorkspaceScreen"

export default async function CompanyPage({ params }: { readonly params: Promise<{ readonly companySlug: string }> }) {
  const { companySlug } = await params
  return <CompanyWorkspaceScreen companySlug={companySlug} />
}
