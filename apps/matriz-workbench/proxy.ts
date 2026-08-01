import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE } from "./src/auth/session"
import { randomBytes, timingSafeEqual } from "node:crypto"
import { buildContentSecurityPolicy } from "./src/auth/content-security-policy"
import { localSessionDigest } from "./src/auth/local-access"

function securedResponse(
  response: NextResponse,
  contentSecurityPolicy: string,
  cacheControl = "no-store",
): NextResponse {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy)
  response.headers.set("Cache-Control", cacheControl)
  return response
}

export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64")
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce, {
    development: process.env.NODE_ENV === "development",
  })
  let expectedSession: string
  try {
    expectedSession = localSessionDigest()
  } catch {
    return securedResponse(
      new NextResponse(
        "WORKBENCH_LOCAL_TOKEN ausente ou curto. Configure um segredo local com pelo menos 16 caracteres.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      ),
      contentSecurityPolicy,
    )
  }

  const pathname = request.nextUrl.pathname
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy)
  requestHeaders.set("x-nonce", nonce)
  const next = () => securedResponse(
    NextResponse.next({ request: { headers: requestHeaders } }),
    contentSecurityPolicy,
    pathname.startsWith("/_next/") ? "public, max-age=31536000, immutable" : "no-store",
  )
  if (pathname === "/unlock" || pathname.startsWith("/_next/")) return next()

  const expected = Buffer.from(expectedSession)
  const cookie = Buffer.from(request.cookies.get(SESSION_COOKIE)?.value ?? "")
  if (expected.length === cookie.length && timingSafeEqual(expected, cookie)) {
    return next()
  }

  const unlockUrl = new URL("/unlock", request.url)
  return securedResponse(NextResponse.redirect(unlockUrl), contentSecurityPolicy)
}

export const config = {
  matcher: ["/((?!favicon.ico).*)"],
}
