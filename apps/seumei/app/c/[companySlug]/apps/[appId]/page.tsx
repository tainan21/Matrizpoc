import { CompanyWorkspaceScreen } from "../../../../../src/domains/hub/presentation/CompanyWorkspaceScreen"

export default async function CompanyAppPage({ params }: { readonly params: Promise<{ readonly companySlug: string; readonly appId: string }> }) {
  const { companySlug, appId } = await params
  return <CompanyWorkspaceScreen companySlug={companySlug} appId={appId} />
}
