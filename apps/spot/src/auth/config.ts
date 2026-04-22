/**
 * Spot — Auth adoption config.
 *
 * L12: only wires `@matriz/platform-auth` with app-scoped choices. No
 * domain reaches into this file. Changing Spot's strategy = change only
 * the strategies array here.
 */
import { asAppId } from "@matriz/foundation-types"
import type { AuthProviderConfig } from "@matriz/platform-auth"
import { spotStrategies } from "./strategies"

export const SPOT_APP_ID = asAppId("spot")

export const spotAuthConfig: AuthProviderConfig = {
  appId: SPOT_APP_ID,
  strategies: spotStrategies,
  sessionTtlMs: 24 * 60 * 60 * 1000,
}

/** Branding for the login screen. Shared auth does NOT force visual identity. */
export const spotLoginCopy = {
  headline: "Entrar no Spot",
  tagline: "Bandas, gigs e artistas do ecossistema Matriz.",
  emailPlaceholder: "voce@banda.com",
  primaryCta: "Enviar codigo",
} as const
