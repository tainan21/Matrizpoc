import type { RecentAppAccess } from "@matriz/platform-auth"

export interface HubAvailabilityRow {
  readonly appId: string
  readonly label: string
  readonly port: number
  readonly status: "online" | "offline" | "current"
}

export interface HubLoginExtensionViewModel {
  readonly availability: readonly HubAvailabilityRow[]
  readonly recentApps: readonly { label: string; detail: string }[]
}

const LABELS: Record<string, string> = {
  "matriz-hub": "Matriz Hub", spot: "Spot", seumei: "Seumei", contracts: "Contracts",
  willdash: "WillDash", "matriz-workbench": "Workbench", sites: "Sites",
}

export function toHubLoginExtensionViewModel(
  availability: readonly Omit<HubAvailabilityRow, "label">[],
  recentApps: readonly RecentAppAccess[],
): HubLoginExtensionViewModel {
  return {
    availability: availability.map((item) => ({ ...item, label: LABELS[item.appId] ?? item.appId })),
    recentApps: recentApps.map((item) => ({
      label: LABELS[item.appId] ?? item.appId,
      detail: new Date(item.openedAt).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    })),
  }
}
