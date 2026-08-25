export interface ContentSecurityPolicyOptions {
  development?: boolean
  production?: boolean
  connectOrigins?: readonly string[]
  developmentWebSocketOrigin?: string
}

type OriginEnvironment = Readonly<Record<string, string | undefined>>
const developmentOrigins = ["http://localhost:3000", "http://localhost:3003"] as const
const deploymentOriginVariables = ["MATRIZ_HUB_ORIGIN", "MATRIZ_CONTRACTS_ORIGIN"] as const

function trustedOrigin(value: string, allowWebSocket = false, production = false): string {
  let origin: URL
  try { origin = new URL(value) } catch { throw new Error("Invalid trusted connect origin.") }
  const isLocalHttp = origin.protocol === "http:" && (origin.hostname === "localhost" || origin.hostname === "127.0.0.1")
  if (!(origin.protocol === "https:" || (!production && isLocalHttp) || (!production && allowWebSocket && (origin.protocol === "ws:" || origin.protocol === "wss:"))) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("Invalid trusted connect origin.")
  }
  return origin.origin
}

export function trustedConnectOrigins(environment: OriginEnvironment = process.env): readonly string[] {
  if (environment.NODE_ENV !== "production") return developmentOrigins
  const missing = deploymentOriginVariables.find((key) => !environment[key])
  if (missing) throw new Error("Missing required trusted connect origin.")
  return deploymentOriginVariables.map((key) => trustedOrigin(environment[key]!, false, true))
}

export function buildContentSecurityPolicy(nonce: string, options: ContentSecurityPolicyOptions = {}): string {
  if (!/^[A-Za-z0-9+/=_-]{16,128}$/.test(nonce)) throw new Error("Invalid CSP nonce.")
  const connectSources = ["'self'", ...(options.connectOrigins ?? []).map((origin) => trustedOrigin(origin, false, options.production)), ...(options.developmentWebSocketOrigin ? [trustedOrigin(options.developmentWebSocketOrigin, true, options.production)] : [])]
  return ["default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.development ? " 'unsafe-eval'" : ""}`, "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'", `connect-src ${connectSources.join(" ")}`, "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"].join("; ")
}
