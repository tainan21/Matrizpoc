/**
 * Matriz Hub — Auth adoption config. Default strategy: magic link.
 */
import { asAppId } from "@matriz/foundation-types"
import type { AuthProviderConfig } from "@matriz/platform-auth"
import { hubStrategies } from "./strategies"
import { createHttpMockAuthBroker } from "@matriz/platform-auth"
import { monorepoConfig } from "@matriz/platform-config"
import type { LoginSkin } from "@matriz/flows-auth"

export const HUB_APP_ID = asAppId("matriz-hub")

export const hubAuthConfig: AuthProviderConfig = {
  appId: HUB_APP_ID,
  strategies: hubStrategies,
  sessionTtlMs: 24 * 60 * 60 * 1000,
  broker: createHttpMockAuthBroker(monorepoConfig.baseUrls["matriz-hub"]),
}

export const hubLoginSkin: LoginSkin = {
  appId: "matriz-hub", product: "Matriz Hub", productLabel: "Ecossistema", mark: "M",
  eyebrow: "Uma identidade, varias plataformas", headline: "Entre uma vez. Circule por toda a Matriz.",
  description: "Acesse produtos independentes com a mesma identidade local, sem apagar o contexto de cada operacao.",
  panelTitle: "Acesse o ecossistema.", footer: "SSO local · quatro metodos mockados · sem cadastro",
  emailPlaceholder: "voce@matriz.com", defaultMethod: "google",
  methods: ["google", "otp", "magic-link", "email"],
}

export const hubLoginCopy = {
  headline: "Matriz Hub",
  tagline: "Ponto central do ecossistema. Acesso por link magico.",
  emailPlaceholder: "voce@matriz.com",
} as const
