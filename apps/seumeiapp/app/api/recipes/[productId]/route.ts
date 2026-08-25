import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../src/application/active-company"
import { readRecipeHandler, saveRecipeHandler } from "../../../../src/http/restaurant-handlers"
import { executeCompanyRequest, readJson } from "../../../../src/http/next-boundary"
export async function GET(request: NextRequest, context: { params: Promise<{ productId: string }> }) { const { productId } = await context.params; const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""; return executeCompanyRequest(request, (services, actor) => readRecipeHandler(actor, companyId, productId, services)) }
export async function PATCH(request: NextRequest, context: { params: Promise<{ productId: string }> }) { const [{ productId }, body] = await Promise.all([context.params, readJson(request)]); const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""; return executeCompanyRequest(request, (services, actor) => saveRecipeHandler(actor, companyId, productId, body, services)) }
