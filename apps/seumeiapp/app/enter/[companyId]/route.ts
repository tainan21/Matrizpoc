import { NextResponse, type NextRequest } from "next/server"
import { ACTIVE_COMPANY_COOKIE } from "../../../src/application/active-company"
import { selectCompanyHandler } from "../../../src/http/company-handlers"
import { executeCompanyRequest } from "../../../src/http/next-boundary"

export async function GET(request: NextRequest, context: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await context.params
  const authorization = await executeCompanyRequest(request, (services, actor) =>
    selectCompanyHandler(actor, { companyId }, services),
  )
  if (authorization.status !== 200) return authorization

  const response = NextResponse.redirect(new URL("/workspace", request.url), 303)
  response.cookies.set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
  return response
}
