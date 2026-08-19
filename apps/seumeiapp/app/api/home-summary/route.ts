import { NextResponse, type NextRequest } from "next/server"
import { readHomeSummary } from "../../../src/application/read-home-summary"
import { resolveSeumeiRequestContext } from "../../../src/auth/server-session"
import { createEstablishmentSummaryRepository } from "../../../src/infrastructure/establishment-summary.repository"

export async function GET(request: NextRequest) {
  const context = await resolveSeumeiRequestContext(request.headers.get("cookie") ?? "")
  if (!context) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const summary = await readHomeSummary(context, createEstablishmentSummaryRepository())
  return NextResponse.json(summary)
}
