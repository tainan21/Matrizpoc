/**
 * Contracts — Auth adoption config. Default strategy: magic link.
 *
 * Contracts recebe sessoes mais longas de producao documental; magic link
 * e o fluxo mais natural para o usuario-tipo (juridico / operacoes).
 */
import { asAppId } from "@matriz/foundation-types"
import type { AuthProviderConfig } from "@matriz/platform-auth"
import { contractsStrategies } from "./strategies"
import { createHttpMockAuthBroker } from "@matriz/platform-auth"
import { monorepoConfig } from "@matriz/platform-config"
import type { LoginSkin } from "@matriz/flows-auth"

export const CONTRACTS_APP_ID = asAppId("contracts")

export const contractsAuthConfig: AuthProviderConfig = {
  appId: CONTRACTS_APP_ID,
  strategies: contractsStrategies,
  sessionTtlMs: 24 * 60 * 60 * 1000,
  broker: createHttpMockAuthBroker(monorepoConfig.baseUrls["matriz-hub"]),
}

export const contractsLoginSkin: LoginSkin = {
  appId: "contracts", product: "Contracts", productLabel: "Documentos & acordos", mark: "C",
  eyebrow: "Acordos com clareza", headline: "Cada compromisso comeca com contexto.",
  description: "Crie, acompanhe e conecte contratos as operacoes que deram origem a cada acordo.",
  panelTitle: "Acesse seus contratos.", footer: "Magic link em destaque · trilha documental · sem cadastro",
  emailPlaceholder: "voce@empresa.com", defaultMethod: "magic-link",
  methods: ["magic-link", "google", "otp", "email"],
}

export const contractsLoginCopy = {
  headline: "Contratos",
  tagline:
    "Plataforma de contratos do ecossistema Matriz. Acesso por link magico no email cadastrado.",
  emailPlaceholder: "voce@empresa.com",
} as const
