import { randomBytes } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { buildContentSecurityPolicy, trustedConnectOrigins } from "./src/security/content-security-policy"

export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64")
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce, {
    development: process.env.NODE_ENV === "development",
    production: process.env.NODE_ENV === "production",
    connectOrigins: trustedConnectOrigins(),
    developmentWebSocketOrigin: process.env.NODE_ENV === "development" ? `${request.nextUrl.protocol === "https:" ? "wss" : "ws"}://${request.nextUrl.host}` : undefined,
  })
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy)
  requestHeaders.set("x-nonce", nonce)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", contentSecurityPolicy)
  response.headers.set("Cache-Control", request.nextUrl.pathname.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "public, max-age=0, s-maxage=300, stale-while-revalidate=600")
  return response
}

export const config = { matcher: ["/((?!favicon.ico).*)"] }
