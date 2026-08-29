/**
 * Seumei — Auth adoption config. Default strategy: OTP.
 *
 * Seumei opera em pontos de venda fisicos; OTP e mais pratico na operacao
 * de balcao/tablet do que um magic link por email.
 */
import { asAppId } from "@matriz/foundation-types"
import type { AuthProviderConfig } from "@matriz/platform-auth"
import { seumeiStrategies } from "./strategies"
import { createConfiguredAuthBroker } from "@matriz/platform-auth"
import { monorepoConfig } from "@matriz/platform-config"
import type { LoginSkin } from "@matriz/flows-auth"

export const MATRIZ_ADMIN_APP_ID = asAppId("matriz-admin")

export const matrizAdminAuthConfig: AuthProviderConfig = {
  appId: MATRIZ_ADMIN_APP_ID,
  strategies: seumeiStrategies,
  sessionTtlMs: 24 * 60 * 60 * 1000,
  broker: createConfiguredAuthBroker({ developmentMockBaseUrl: monorepoConfig.baseUrls["matriz-hub"] }),
}

export const matrizAdminLoginSkin: LoginSkin = {
  appId: "matriz-admin", product: "Matriz Admin", productLabel: "Ecossistema", mark: "M",
  eyebrow: "Operacao em movimento", headline: "Seu negocio aberto para o que vem.",
  description: "Acompanhe estabelecimentos, regioes e rotinas com clareza para decidir no tempo da operacao.",
  panelTitle: "Acesse a administracao.", footer: "OTP administrativo · sessao Matriz",
  emailPlaceholder: "voce@seuestabelecimento.com", defaultMethod: "otp",
  methods: ["otp", "google", "magic-link", "email"],
}

export const seumeiLoginCopy = {
  headline: "Seumei",
  tagline: "Operacao de estabelecimentos no ecossistema Matriz.",
  emailPlaceholder: "voce@seuestabelecimento.com",
  primaryCta: "Receber codigo",
} as const
