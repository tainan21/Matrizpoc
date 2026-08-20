import { NextResponse, type NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../src/auth/active-company"
import { selectCompanyHandler } from "../../../src/http/company-handlers"
import { executeCompanyRequest, readJson } from "../../../src/http/next-boundary"

export async function POST(request: NextRequest) {
  const body = await readJson(request)
  const response = await executeCompanyRequest(request, (services, actor) => selectCompanyHandler(actor, body, services))
  if (response.status !== 200 || !body || typeof body !== "object" || typeof (body as { companyId?: unknown }).companyId !== "string") {
    return response
  }
  const next = new NextResponse(response.body, response)
  next.cookies.set(ACTIVE_COMPANY_COOKIE, (body as { companyId: string }).companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
  return next
}
