import type { MatrizAppId } from "@matriz/foundation-constants"

export interface CapabilityAppearanceDTO {
  readonly activeThemeKey: string
  readonly source: "base" | "user"
  readonly suggestedThemeKey?: string
  readonly fallbackApplied: boolean
  readonly persistence: "demo" | "database"
}

export interface CapabilityThemeDTO {
  readonly key: string
  readonly version: number
  readonly label: string
  readonly description: string
  readonly compatibleApps: readonly MatrizAppId[]
  readonly premium: boolean
  readonly priceLabel: string
  readonly unlocked: boolean
}

export interface CapabilityPracticyWorkspaceDTO {
  readonly version: 1
  readonly installedIds: readonly string[]
  readonly recent: readonly { readonly appId: string; readonly openedAt: string }[]
  readonly layout: readonly { readonly appId: string; readonly size: "compact" | "wide" }[]
}

export interface CapabilityAppearanceResponseDTO { readonly appearance: CapabilityAppearanceDTO }
export interface CapabilityThemesResponseDTO { readonly themes: readonly CapabilityThemeDTO[]; readonly persistence: "demo" | "database" }
export interface CapabilityPracticiesResponseDTO { readonly workspace: CapabilityPracticyWorkspaceDTO; readonly persistence: "demo" | "database" }
