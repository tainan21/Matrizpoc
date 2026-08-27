import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../src/application/active-company"
import { readOrderHandler, transitionOrderHandler } from "../../../../src/http/commerce-handlers"
import { executeCompanyRequest, readJson } from "../../../../src/http/next-boundary"
export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) { const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""; const { orderId } = await context.params; return executeCompanyRequest(request, (services, actor) => readOrderHandler(actor, companyId, orderId, services)) }
export async function PATCH(request: NextRequest, context: { params: Promise<{ orderId: string }> }) { const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""; const { orderId } = await context.params; const body = await readJson(request); return executeCompanyRequest(request, (services, actor) => transitionOrderHandler(actor, companyId, orderId, body, services)) }
