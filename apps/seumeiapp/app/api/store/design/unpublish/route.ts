import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../../src/application/active-company"
import { unpublishStoreDesignHandler } from "../../../../../src/http/store-design-handlers"
import { executeCompanyRequest, readJson } from "../../../../../src/http/next-boundary"
export async function POST(request: NextRequest) { const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""; const body = await readJson(request); return executeCompanyRequest(request, (services, actor) => unpublishStoreDesignHandler(actor, companyId, body, services)) }
