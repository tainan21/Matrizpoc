/**
 * Contracts — Auth adoption config. Default strategy: magic link.
 *
 * Contracts recebe sessoes mais longas de producao documental; magic link
 * e o fluxo mais natural para o usuario-tipo (juridico / operacoes).
 */
import { asAppId } from "@matriz/foundation-types"
import type { AuthProviderConfig } from "@matriz/platform-auth"
import { contractsStrategies } from "./strategies"

export const CONTRACTS_APP_ID = asAppId("contracts")

export const contractsAuthConfig: AuthProviderConfig = {
  appId: CONTRACTS_APP_ID,
  strategies: contractsStrategies,
  sessionTtlMs: 24 * 60 * 60 * 1000,
}

export const contractsLoginCopy = {
  headline: "Contratos",
  tagline:
    "Plataforma de contratos do ecossistema Matriz. Acesso por link magico no email cadastrado.",
  emailPlaceholder: "voce@empresa.com",
} as const
