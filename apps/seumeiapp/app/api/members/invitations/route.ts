import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../src/application/active-company"
import { createInvitationHandler } from "../../../../src/http/membership-handlers"
import { executeCompanyRequest, readJson } from "../../../../src/http/next-boundary"

export async function POST(request: NextRequest) {
  const body = await readJson(request)
  const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""
  return executeCompanyRequest(request, (services, actor) =>
    createInvitationHandler(actor, companyId, body, services),
  )
}
