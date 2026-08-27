import type { LoginSkin } from "@matriz/flows-auth"
import { asAppId } from "@matriz/foundation-types"
import { createHttpMockAuthBroker, createOtpStrategy, type AuthProviderConfig } from "@matriz/platform-auth"
import { monorepoConfig } from "@matriz/platform-config"

export const seumeiAuthConfig: AuthProviderConfig = {
  appId: asAppId("seumei"),
  strategies: [createOtpStrategy()],
  sessionTtlMs: 24 * 60 * 60 * 1000,
  broker: createHttpMockAuthBroker(monorepoConfig.baseUrls["matriz-hub"]),
}

export const seumeiLoginSkin: LoginSkin = {
  appId: "seumei", product: "Seumei", productLabel: "Sua empresa", mark: "S",
  eyebrow: "Comece pela sua empresa", headline: "Tudo pronto para abrir.",
  description: "Entre, configure sua operação e publique quando estiver pronto.",
  panelTitle: "Entrar na Seumei", footer: "OTP · sessão Matriz · multitenant",
  emailPlaceholder: "voce@suaempresa.com", defaultMethod: "otp", methods: ["otp"],
}
