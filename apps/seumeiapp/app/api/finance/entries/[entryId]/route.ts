import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../../src/application/active-company"
import { readFinanceEntryHandler } from "../../../../../src/http/finance-handlers"
import { executeCompanyRequest } from "../../../../../src/http/next-boundary"

export async function GET(request: NextRequest, context: { params: Promise<{ entryId: string }> }) {
  const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""
  const { entryId } = await context.params
  return executeCompanyRequest(request, (services, actor) => readFinanceEntryHandler(actor, companyId, entryId, services))
}
