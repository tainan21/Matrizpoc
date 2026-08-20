import { NextResponse, type NextRequest } from "next/server"
import { createCompanyServices } from "../application/composition"
import { resolveSeumeiSession } from "../auth/server-session"
import { withAuthenticatedSession, type CompanyHttpServices, type HttpResult } from "./company-handlers"

export function jsonResult(result: HttpResult): NextResponse {
  return NextResponse.json(result.body, { status: result.status })
}

export async function executeCompanyRequest(
  request: NextRequest,
  action: (services: CompanyHttpServices, actor: Parameters<Parameters<typeof withAuthenticatedSession>[1]>[0]) => Promise<HttpResult>,
): Promise<NextResponse> {
  const session = await resolveSeumeiSession(request.headers.get("cookie") ?? "")
  const result = await withAuthenticatedSession(session, async (actor) => {
    const resolution = createCompanyServices()
    if (resolution.kind === "unavailable") {
      return { status: 503, body: { error: "database_unavailable" } }
    }
    return action(resolution.services, actor)
  })
  return jsonResult(result)
}

export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
