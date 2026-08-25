import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../../src/application/active-company"
import { createStockMovementHandler, readStockHandler } from "../../../../../src/http/restaurant-handlers"
import { executeCompanyRequest, readJson } from "../../../../../src/http/next-boundary"
export async function GET(request: NextRequest, context: { params: Promise<{ ingredientId: string }> }) { const { ingredientId } = await context.params; const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""; return executeCompanyRequest(request, (services, actor) => readStockHandler(actor, companyId, ingredientId, services)) }
export async function POST(request: NextRequest, context: { params: Promise<{ ingredientId: string }> }) { const [{ ingredientId }, body] = await Promise.all([context.params, readJson(request)]); const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""; return executeCompanyRequest(request, (services, actor) => createStockMovementHandler(actor, companyId, ingredientId, body, services)) }
