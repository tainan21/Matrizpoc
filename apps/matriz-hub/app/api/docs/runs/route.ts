import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse } from "../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const actor = getDocsActorContextFromRequest(request)
    const runs = await makeDocsRepository().listRuns(actor)
    return NextResponse.json({ ok: true, runs })
  } catch (error) {
    return docsErrorResponse(error, 500)
  }
}
