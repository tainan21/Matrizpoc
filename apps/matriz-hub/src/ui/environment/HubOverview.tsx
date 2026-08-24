import { OverviewSpatialWorkspace } from "./OverviewSpatialWorkspace"
import type { HubOverviewVM } from "./types"

export function HubOverview({ viewModel }: { readonly viewModel: HubOverviewVM }) {
  return <OverviewSpatialWorkspace viewModel={viewModel} />
}
