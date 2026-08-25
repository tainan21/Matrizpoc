import { NextResponse, type NextRequest } from "next/server"
import { configuredToken, CONTROL_SESSION_COOKIE, verifySessionValue } from "./src/auth/local-access"

const loopbackHosts = new Set(["localhost:3008", "127.0.0.1:3008", "[::1]:3008"])

export function proxy(request: NextRequest) {
  if (!loopbackHosts.has(request.headers.get("host") ?? "")) return new NextResponse("Matriz Control accepts loopback requests only.", { status: 403 })
  const pathname = request.nextUrl.pathname
  if (pathname === "/unlock" || pathname.startsWith("/_next/")) return NextResponse.next()
  let configured: string
  try { configured = configuredToken() } catch { return new NextResponse("MATRIZ_CONTROL_LOCAL_TOKEN is missing or shorter than 16 characters.", { status: 503 }) }
  const session = request.cookies.get(CONTROL_SESSION_COOKIE)?.value
  if (session && verifySessionValue(configured, session)) return NextResponse.next()
  if (pathname.startsWith("/api/")) return Response.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.redirect(new URL("/unlock", request.url))
}

export const config = { matcher: ["/((?!favicon.ico).*)"] }
