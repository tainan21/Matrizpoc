import type { NextRequest } from "next/server"
import { readPortfolioHandler } from "../../../../../src/http/portfolio-handler"
import { executeCompanyRequest } from "../../../../../src/http/next-boundary"

export async function GET(request: NextRequest) {
  const authority = request.nextUrl.searchParams.has("tenantId") ? { tenantId: request.nextUrl.searchParams.get("tenantId") } : undefined
  const response = await executeCompanyRequest(request, (services, actor) => readPortfolioHandler(actor, services, undefined, authority))
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
