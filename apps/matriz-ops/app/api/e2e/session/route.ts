import { NextResponse } from "next/server"
import { OPS_SESSION_COOKIE } from "../../../../src/server/ops-session"

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"])

export async function GET(request: Request) {
  const url = new URL(request.url)
  const enabled = process.env.MATRIZ_RUNTIME_PROFILE === "local" && process.env.OPS_E2E_ENABLED === "true"

  if (!enabled || !LOOPBACK_HOSTS.has(url.hostname)) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 })
  }

  const token = process.env.OPS_E2E_SESSION_TOKEN
  if (!token) return Response.json({ error: "E2E_SESSION_NOT_CONFIGURED" }, { status: 503 })

  const response = NextResponse.redirect(new URL("/", url))
  response.cookies.set(OPS_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    path: "/",
    maxAge: 15 * 60,
  })
  return response
}
