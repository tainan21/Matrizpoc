import {
  themeRegistry,
  type ThemeDefinition,
  type ThemeKey,
} from "@matriz/design-system"
import type { MatrizAppId } from "@matriz/foundation-constants"

export interface ThemeCapabilityDefinition {
  readonly key: string
  readonly version: number
  readonly compatibleApps: readonly MatrizAppId[]
}

export interface ThemeOffer extends ThemeDefinition {
  readonly key: ThemeKey
  readonly priceLabel: string
  readonly premium: boolean
}

const themeOfferDetails = {
  "matriz-base": { priceLabel: "Sempre disponível", premium: false },
  "midnight-graphite": { priceLabel: "R$ 24 · demo", premium: true },
  aurora: { priceLabel: "R$ 24 · demo", premium: true },
  terra: { priceLabel: "R$ 24 · demo", premium: true },
} as const satisfies Readonly<Record<ThemeKey, Pick<ThemeOffer, "priceLabel" | "premium">>>

export const themeOffers: readonly ThemeOffer[] = themeRegistry.map((theme) => ({
  ...theme,
  ...themeOfferDetails[theme.key],
}))

export function getThemeOffer(key: string): ThemeOffer | undefined {
  return themeOffers.find((offer) => offer.key === key)
}

export function listCompatibleThemeOffers(appId: MatrizAppId): readonly ThemeOffer[] {
  return themeOffers.filter((offer) => offer.compatibleApps.includes(appId))
}

export interface AppearanceResolutionInput {
  readonly appId: MatrizAppId
  readonly catalog: readonly ThemeCapabilityDefinition[]
  readonly userThemeKey?: string
  readonly organizationThemeKey?: string
}

export interface AppearanceResolution {
  readonly activeThemeKey: string
  readonly source: "base" | "user"
  readonly suggestedThemeKey?: string
  readonly fallbackApplied: boolean
}

const BASE_THEME_KEY = "matriz-base"

function supports(
  catalog: readonly ThemeCapabilityDefinition[],
  appId: MatrizAppId,
  themeKey: string | undefined,
): boolean {
  return Boolean(themeKey && catalog.find((theme) => theme.key === themeKey)?.compatibleApps.includes(appId))
}

export function resolveAppearance(input: AppearanceResolutionInput): AppearanceResolution {
  const selectedIsCompatible = supports(input.catalog, input.appId, input.userThemeKey)
  const organizationIsCompatible = supports(input.catalog, input.appId, input.organizationThemeKey)
  const baseIsCompatible = supports(input.catalog, input.appId, BASE_THEME_KEY)
  const activeThemeKey = selectedIsCompatible
    ? input.userThemeKey!
    : baseIsCompatible
      ? BASE_THEME_KEY
      : input.catalog.find((theme) => theme.compatibleApps.includes(input.appId))?.key ?? BASE_THEME_KEY

  return {
    activeThemeKey,
    source: selectedIsCompatible ? "user" : "base",
    suggestedThemeKey: !selectedIsCompatible && organizationIsCompatible && input.organizationThemeKey !== activeThemeKey
      ? input.organizationThemeKey
      : undefined,
    fallbackApplied: Boolean(input.userThemeKey && !selectedIsCompatible),
  }
}
