import { HubOverview } from "../src/ui/environment/HubOverview"
import { loadHubOverview } from "../src/ui/environment/overview-source"

export const dynamic = "force-dynamic"

export default async function HubLandingPage() {
  const viewModel = await loadHubOverview()
  return <HubOverview viewModel={viewModel} />
}
