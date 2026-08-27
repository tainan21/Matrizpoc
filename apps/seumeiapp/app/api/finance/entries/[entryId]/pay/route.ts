import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../../../src/application/active-company"
import { payFinanceEntryHandler } from "../../../../../../src/http/finance-handlers"
import { executeCompanyRequest, readJson } from "../../../../../../src/http/next-boundary"

export async function POST(request: NextRequest, context: { params: Promise<{ entryId: string }> }) {
  const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""
  const { entryId } = await context.params
  const body = await readJson(request)
  return executeCompanyRequest(request, (services, actor) => payFinanceEntryHandler(actor, companyId, entryId, body, services))
}
