export type IdentityEnvironment = {
  issuer: string
  databaseUrl: string
  csrfSecret?: string
  cookieKeys?: string[]
  jwks: { keys: JsonWebKey[] }
  trustProxy: boolean
  trustedProxyHops: number
  port: number
}

type PrivateSigningJwk = JsonWebKey & { kid: string; d: string }

type ProviderConfiguration = {
  adapter?: unknown
  clients?: readonly Record<string, unknown>[]
  claims: Record<string, readonly string[]>
  features: Record<string, { enabled: boolean }>
  findAccount?: unknown
  jwks: { keys: JsonWebKey[] }
  pkce: { methods: readonly ["S256"]; required: () => boolean }
  rotateRefreshToken: boolean
  issueRefreshToken: (_context: unknown, client: { grantTypeAllowed(type: string): boolean }, code: { scopes: Set<string> }) => boolean
  scopes: readonly string[]
  ttl: { AccessToken: number; AuthorizationCode: number; IdToken: number; Interaction: number; RefreshToken: number; Session: number; Grant: number }
  cookies?: { keys: string[] }
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export function loadIdentityEnvironment(env: NodeJS.ProcessEnv): IdentityEnvironment {
  const issuer = required(env, "IDENTITY_ISSUER")
  const databaseUrl = required(env, "CORE_RUNTIME_DATABASE_URL")
  const rawJwks = required(env, "IDENTITY_SIGNING_JWKS")
  const production = env.NODE_ENV === "production"
  const parsedIssuer = new URL(issuer)
  if (production && parsedIssuer.protocol !== "https:") {
    throw new Error("IDENTITY_ISSUER must use https in production")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawJwks)
  } catch {
    throw new Error("IDENTITY_SIGNING_JWKS must be valid JSON")
  }
  const keys = Array.isArray((parsed as { keys?: unknown })?.keys)
    ? (parsed as { keys: PrivateSigningJwk[] }).keys
    : [parsed as PrivateSigningJwk]
  if (keys.length === 0 || keys.some((key) => !key.kty || !key.kid || !key.d)) {
    throw new Error("IDENTITY_SIGNING_JWKS must contain asymmetric private keys with kid")
  }

  const port = Number(env.PORT ?? "8080")
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("PORT is invalid")
  const trustProxy = env.IDENTITY_TRUST_PROXY === "true"
  const trustedProxyHops = Number(env.IDENTITY_TRUSTED_PROXY_HOPS ?? "0")
  if (!Number.isSafeInteger(trustedProxyHops) || trustedProxyHops < 0 || trustedProxyHops > 8) throw new Error("IDENTITY_TRUSTED_PROXY_HOPS is invalid")
  if (trustProxy && trustedProxyHops < 1) throw new Error("IDENTITY_TRUSTED_PROXY_HOPS must be configured when proxy trust is enabled")
  const csrfSecret = required(env, "IDENTITY_CSRF_SECRET")
  if (csrfSecret.length < 32) throw new Error("IDENTITY_CSRF_SECRET must contain at least 32 characters")
  const cookieKeys = required(env, "IDENTITY_COOKIE_KEYS").split(",").map((value) => value.trim()).filter(Boolean)
  if (cookieKeys.length < 2 || cookieKeys.some((key) => key.length < 32)) throw new Error("IDENTITY_COOKIE_KEYS requires at least two 32-character keys")
  return { issuer: parsedIssuer.toString().replace(/\/$/, ""), databaseUrl, jwks: { keys }, trustProxy, trustedProxyHops, port, csrfSecret, cookieKeys }
}

export function buildProviderConfiguration(environment: IdentityEnvironment): ProviderConfiguration {
  return {
    claims: {
      openid: ["sub"],
      profile: ["name", "locale", "zoneinfo"],
      email: ["email", "email_verified"],
    },
    ...(environment.cookieKeys ? { cookies: { keys: environment.cookieKeys } } : {}),
    features: {
      devInteractions: { enabled: false },
      revocation: { enabled: true },
      introspection: { enabled: true },
      rpInitiatedLogout: { enabled: true },
    },
    jwks: environment.jwks,
    pkce: { methods: ["S256"], required: () => true },
    rotateRefreshToken: true,
    issueRefreshToken: (_context, client, code) => client.grantTypeAllowed("refresh_token") && code.scopes.has("offline_access"),
    scopes: ["openid", "profile", "email", "offline_access"],
    ttl: {
      AccessToken: 5 * 60,
      AuthorizationCode: 60,
      IdToken: 5 * 60,
      Interaction: 10 * 60,
      RefreshToken: 7 * 24 * 60 * 60,
      Session: 8 * 60 * 60,
      Grant: 30 * 24 * 60 * 60,
    },
  }
}
