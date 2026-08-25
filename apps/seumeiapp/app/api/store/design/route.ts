import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../src/application/active-company"
import { readStoreDesignHandler, saveStoreDesignHandler } from "../../../../src/http/store-design-handlers"
import { executeCompanyRequest, readJson } from "../../../../src/http/next-boundary"
export async function GET(request: NextRequest) { const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""; return executeCompanyRequest(request, (services, actor) => readStoreDesignHandler(actor, companyId, services)) }
export async function PATCH(request: NextRequest) { const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""; const body = await readJson(request); return executeCompanyRequest(request, (services, actor) => saveStoreDesignHandler(actor, companyId, body, services)) }
