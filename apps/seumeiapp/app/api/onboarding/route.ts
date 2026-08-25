import type { NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../src/application/active-company"
import {
  completeOnboardingHandler,
  readOnboardingHandler,
  saveOnboardingHandler,
} from "../../../src/http/company-handlers"
import { executeCompanyRequest, readJson } from "../../../src/http/next-boundary"

function activeCompanyId(request: NextRequest): string {
  return request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value ?? ""
}

export async function GET(request: NextRequest) {
  return executeCompanyRequest(request, (services, actor) => readOnboardingHandler(actor, activeCompanyId(request), services))
}

export async function PATCH(request: NextRequest) {
  const body = await readJson(request)
  return executeCompanyRequest(request, (services, actor) => saveOnboardingHandler(actor, activeCompanyId(request), body, services))
}

export async function POST(request: NextRequest) {
  const body = await readJson(request)
  return executeCompanyRequest(request, (services, actor) => completeOnboardingHandler(actor, activeCompanyId(request), body, services))
}
