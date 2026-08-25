import { NextResponse, type NextRequest } from "next/server"
import { randomBytes } from "node:crypto"
import { buildContentSecurityPolicy, trustedConnectOrigins } from "./src/security/content-security-policy"

const publicPaths = new Set(["/login", "/public", "/audit"])

/** Applies browser isolation and keeps tenant/authenticated responses out of shared caches. */
export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64")
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce, {
    development: process.env.NODE_ENV === "development",
    production: process.env.NODE_ENV === "production",
    connectOrigins: trustedConnectOrigins(),
    developmentWebSocketOrigin: process.env.NODE_ENV === "development"
      ? `${request.nextUrl.protocol === "https:" ? "wss" : "ws"}://${request.nextUrl.host}`
      : undefined,
  })
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy)
  requestHeaders.set("x-nonce", nonce)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", contentSecurityPolicy)
  response.headers.set(
    "cache-control",
    request.nextUrl.pathname.startsWith("/_next/static/")
      ? "public, max-age=31536000, immutable"
      : publicPaths.has(request.nextUrl.pathname)
        ? "no-cache"
        : "private, no-store",
  )
  return response
}

export const config = { matcher: ["/((?!favicon.ico).*)"] }
