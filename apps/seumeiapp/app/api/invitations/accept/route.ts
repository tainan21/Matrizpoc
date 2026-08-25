import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../src/application/active-company"
import { createCompanyServices } from "../../../../src/application/composition"
import { resolveSeumeiSession } from "../../../../src/auth/server-session"
import { withAuthenticatedSession } from "../../../../src/http/company-handlers"
import { acceptInvitationHandler } from "../../../../src/http/membership-handlers"
import { jsonResult, readJson } from "../../../../src/http/next-boundary"

export async function POST(request: NextRequest) {
  const body = await readJson(request)
  const session = await resolveSeumeiSession(request.headers.get("cookie") ?? "")
  const result = await withAuthenticatedSession(session, async (actor) => {
    const resolution = createCompanyServices()
    if (resolution.kind === "unavailable") {
      return { status: 503, body: { error: "database_unavailable" } }
    }
    return acceptInvitationHandler(actor, body, resolution.services)
  })
  const response = jsonResult(result)
  const activeCompanyId = "activeCompanyId" in result &&
    typeof result.activeCompanyId === "string"
    ? result.activeCompanyId
    : ""
  if (!activeCompanyId || response.status !== 200) return response

  const next = new Response(response.body, response)
  const headers = new Headers(next.headers)
  const cookie = `${ACTIVE_COMPANY_COOKIE}=${encodeURIComponent(activeCompanyId)}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  headers.append("set-cookie", cookie)
  return new Response(next.body, { status: next.status, statusText: next.statusText, headers })
}
