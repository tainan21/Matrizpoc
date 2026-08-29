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
import { createConfiguredAuthBroker } from "@matriz/platform-auth"
import { monorepoConfig } from "@matriz/platform-config"
import type { LoginSkin } from "@matriz/flows-auth"

export const WILLDASH_APP_ID = asAppId("willdash")

export const willdashAuthConfig: AuthProviderConfig = {
  appId: WILLDASH_APP_ID,
  strategies: willdashStrategies,
  sessionTtlMs: 24 * 60 * 60 * 1000,
  broker: createConfiguredAuthBroker({ developmentMockBaseUrl: monorepoConfig.baseUrls["matriz-hub"] }),
}

export const willdashLoginSkin: LoginSkin = {
  appId: "willdash", product: "WillDash", productLabel: "Metas & sinais", mark: "W",
  eyebrow: "Metas em movimento", headline: "Decida olhando para o que mudou.",
  description: "Transforme atividade e telemetria em uma leitura clara do progresso da sua operacao.",
  panelTitle: "Entre no seu dashboard.", footer: "Magic link em destaque · telemetria local · sem cadastro",
  emailPlaceholder: "voce@matriz.com", defaultMethod: "magic-link",
  methods: ["magic-link", "google", "otp", "email"],
}

export const willdashLoginCopy = {
  headline: "Willdash",
  tagline: "Telemetria agregada do ecossistema Matriz.",
  emailPlaceholder: "voce@matriz.com",
} as const
