/**
 * Willdash — Auth adoption config. Default strategy: magic link.
 *
 * Willdash e read-only (observa eventos e mostra telemetria). Usuarios
 * entram com baixa frequencia; magic link e o fluxo mais natural e nao
 * exige ter o tablet/celular do colaborador do Spot.
 */
import { asAppId } from "@matriz/foundation-types"
import type { AuthProviderConfig } from "@matriz/platform-auth"
import { willdashStrategies } from "./strategies"

export const WILLDASH_APP_ID = asAppId("willdash")

export const willdashAuthConfig: AuthProviderConfig = {
  appId: WILLDASH_APP_ID,
  strategies: willdashStrategies,
  sessionTtlMs: 24 * 60 * 60 * 1000,
}

export const willdashLoginCopy = {
  headline: "Willdash",
  tagline: "Telemetria agregada do ecossistema Matriz.",
  emailPlaceholder: "voce@matriz.com",
} as const
