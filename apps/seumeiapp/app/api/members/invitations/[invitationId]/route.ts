import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../../src/application/active-company"
import { revokeInvitationHandler } from "../../../../../src/http/membership-handlers"
import { executeCompanyRequest } from "../../../../../src/http/next-boundary"

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ invitationId: string }> },
) {
  const { invitationId } = await context.params
  const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""
  return executeCompanyRequest(request, (services, actor) =>
    revokeInvitationHandler(actor, companyId, invitationId, services),
  )
}
