import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse } from "../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const actor = getDocsActorContextFromRequest(request)
    const url = new URL(request.url)
    const timeline = await makeDocsRepository().listTimeline(actor, {
      targetType: url.searchParams.get("targetType") ?? undefined,
      targetId: url.searchParams.get("targetId") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 100),
    })
    return NextResponse.json({ ok: true, timeline })
  } catch (error) {
    return docsErrorResponse(error, 500)
  }
}
