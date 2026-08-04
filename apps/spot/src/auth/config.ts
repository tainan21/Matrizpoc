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
import { createHttpMockAuthBroker } from "@matriz/platform-auth"
import { monorepoConfig } from "@matriz/platform-config"
import type { LoginSkin } from "@matriz/flows-auth"

export const SPOT_APP_ID = asAppId("spot")

export const spotAuthConfig: AuthProviderConfig = {
  appId: SPOT_APP_ID,
  strategies: spotStrategies,
  sessionTtlMs: 24 * 60 * 60 * 1000,
  broker: createHttpMockAuthBroker(monorepoConfig.baseUrls["matriz-hub"]),
}

export const spotLoginSkin: LoginSkin = {
  appId: "spot", product: "Spot", productLabel: "Artistas & gigs", mark: "S",
  eyebrow: "Palco, agenda, movimento", headline: "O proximo show comeca aqui.",
  description: "Organize artistas, oportunidades e gigs em um fluxo feito para quem mantem a cena em movimento.",
  panelTitle: "Entre no Spot.", footer: "OTP em destaque · sessao Matriz · sem cadastro",
  emailPlaceholder: "voce@banda.com", defaultMethod: "otp",
  methods: ["otp", "google", "magic-link", "email"],
}

/** Branding for the login screen. Shared auth does NOT force visual identity. */
export const spotLoginCopy = {
  headline: "Entrar no Spot",
  tagline: "Bandas, gigs e artistas do ecossistema Matriz.",
  emailPlaceholder: "voce@banda.com",
  primaryCta: "Enviar codigo",
} as const
