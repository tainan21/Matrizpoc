import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../src/application/active-company"
import { readCustomerHandler } from "../../../../src/http/commerce-handlers"
import { executeCompanyRequest } from "../../../../src/http/next-boundary"
export async function GET(request: NextRequest, context: { params: Promise<{ customerId: string }> }) { const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""; const { customerId } = await context.params; return executeCompanyRequest(request, (services, actor) => readCustomerHandler(actor, companyId, customerId, services)) }
