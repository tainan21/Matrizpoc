import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../../../src/application/active-company"
import { updateProductHandler } from "../../../../../src/http/catalog-handlers"
import { executeCompanyRequest, readJson } from "../../../../../src/http/next-boundary"
export async function PATCH(request: NextRequest, context: { params: Promise<{ productId: string }> }) {
  const companyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""
  const [{ productId }, body] = await Promise.all([context.params, readJson(request)])
  return executeCompanyRequest(request, (services, actor) => updateProductHandler(actor, companyId, productId, body, services))
}
