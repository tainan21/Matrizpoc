/**
 * Matriz Hub — Auth adoption config. Default strategy: magic link.
 */
import { asAppId } from "@matriz/foundation-types"
import type { AuthProviderConfig } from "@matriz/platform-auth"
import { hubStrategies } from "./strategies"

export const HUB_APP_ID = asAppId("matriz-hub")

export const hubAuthConfig: AuthProviderConfig = {
  appId: HUB_APP_ID,
  strategies: hubStrategies,
  sessionTtlMs: 24 * 60 * 60 * 1000,
}

export const hubLoginCopy = {
  headline: "Matriz Hub",
  tagline: "Ponto central do ecossistema. Acesso por link magico.",
  emailPlaceholder: "voce@matriz.com",
} as const
