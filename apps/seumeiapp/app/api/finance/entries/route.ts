import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../src/application/active-company"
import { createFinanceEntryHandler, listFinanceHandler } from "../../../../src/http/finance-handlers"
import { executeCompanyRequest, readJson } from "../../../../src/http/next-boundary"

export async function GET(request: NextRequest) {
  const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""
  const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7)
  return executeCompanyRequest(request, (services, actor) => listFinanceHandler(actor, companyId, month, services))
}

export async function POST(request: NextRequest) {
  const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""
  const body = await readJson(request)
  return executeCompanyRequest(request, (services, actor) => createFinanceEntryHandler(actor, companyId, body, services))
}
