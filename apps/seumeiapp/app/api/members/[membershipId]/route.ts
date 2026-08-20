import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../src/application/active-company"
import {
  changeMembershipRoleHandler,
  removeMembershipHandler,
} from "../../../../src/http/membership-handlers"
import { executeCompanyRequest, readJson } from "../../../../src/http/next-boundary"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ membershipId: string }> },
) {
  const body = await readJson(request)
  const { membershipId } = await context.params
  const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""
  return executeCompanyRequest(request, (services, actor) =>
    changeMembershipRoleHandler(actor, companyId, membershipId, body, services),
  )
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ membershipId: string }> },
) {
  const { membershipId } = await context.params
  const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""
  return executeCompanyRequest(request, (services, actor) =>
    removeMembershipHandler(actor, companyId, membershipId, services),
  )
}
