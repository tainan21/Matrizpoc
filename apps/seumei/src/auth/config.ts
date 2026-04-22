/**
 * Seumei — Auth adoption config. Default strategy: OTP.
 *
 * Seumei opera em pontos de venda fisicos; OTP e mais pratico na operacao
 * de balcao/tablet do que um magic link por email.
 */
import { asAppId } from "@matriz/foundation-types"
import type { AuthProviderConfig } from "@matriz/platform-auth"
import { seumeiStrategies } from "./strategies"

export const SEUMEI_APP_ID = asAppId("seumei")

export const seumeiAuthConfig: AuthProviderConfig = {
  appId: SEUMEI_APP_ID,
  strategies: seumeiStrategies,
  sessionTtlMs: 24 * 60 * 60 * 1000,
}

export const seumeiLoginCopy = {
  headline: "Seumei",
  tagline: "Operacao de estabelecimentos no ecossistema Matriz.",
  emailPlaceholder: "voce@seuestabelecimento.com",
  primaryCta: "Receber codigo",
} as const
