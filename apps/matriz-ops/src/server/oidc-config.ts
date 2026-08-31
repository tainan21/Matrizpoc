import type { OidcBffConfig } from "@matriz/platform-auth/server"

type OidcEnvironment = Record<string, string | undefined>

function required(environment: OidcEnvironment, name: string): string {
  const value = environment[name]?.trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export function oidcConfig(environment: OidcEnvironment = process.env): OidcBffConfig {
  return {
    issuer: required(environment, "MATRIZ_IDENTITY_ISSUER"),
    clientId: required(environment, "OPS_OIDC_CLIENT_ID"),
    clientSecret: required(environment, "OPS_OIDC_CLIENT_SECRET"),
    appId: "matriz-ops",
    callbackUrl: required(environment, "OPS_OIDC_CALLBACK_URL"),
    sessionSecret: required(environment, "OPS_SESSION_SECRET"),
  }
}
