import type { NextRequest } from "next/server"
import { createCompanyHandler, listCompaniesHandler } from "../../../src/http/company-handlers"
import { executeCompanyRequest, readJson } from "../../../src/http/next-boundary"

export async function GET(request: NextRequest) {
  return executeCompanyRequest(request, (services, actor) => listCompaniesHandler(actor, services))
}

export async function POST(request: NextRequest) {
  const body = await readJson(request)
  return executeCompanyRequest(request, (services, actor) => createCompanyHandler(actor, body, services))
}
