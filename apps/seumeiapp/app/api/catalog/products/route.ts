import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../src/application/active-company"
import { createProductHandler, listCatalogHandler } from "../../../../src/http/catalog-handlers"
import { executeCompanyRequest, readJson } from "../../../../src/http/next-boundary"
export async function GET(request: NextRequest) {
  const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""
  return executeCompanyRequest(request, (services, actor) => listCatalogHandler(actor, companyId, services))
}
export async function POST(request: NextRequest) {
  const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""
  const body = await readJson(request)
  return executeCompanyRequest(request, (services, actor) => createProductHandler(actor, companyId, body, services))
}
