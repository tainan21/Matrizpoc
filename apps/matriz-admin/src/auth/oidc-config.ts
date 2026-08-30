import type { OidcBffConfig } from "@matriz/platform-auth/server"

type OidcEnvironment = Readonly<Record<string, string | undefined>>
function required(environment: OidcEnvironment, name: string) { const value = environment[name]?.trim(); if (!value) throw new Error(`Missing ${name}`); return value }
export function oidcConfig(environment: OidcEnvironment = process.env): OidcBffConfig { return { issuer: required(environment, "MATRIZ_IDENTITY_ISSUER"), clientId: required(environment, "ADMIN_OIDC_CLIENT_ID"), clientSecret: required(environment, "ADMIN_OIDC_CLIENT_SECRET"), appId: "matriz-admin", callbackUrl: required(environment, "ADMIN_OIDC_CALLBACK_URL"), sessionSecret: required(environment, "ADMIN_SESSION_SECRET") } }
