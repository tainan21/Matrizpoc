import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../src/application/active-company"
import { listOrdersHandler } from "../../../src/http/commerce-handlers"
import { executeCompanyRequest } from "../../../src/http/next-boundary"
export async function GET(request: NextRequest) { const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""; return executeCompanyRequest(request, (services, actor) => listOrdersHandler(actor, companyId, services)) }
