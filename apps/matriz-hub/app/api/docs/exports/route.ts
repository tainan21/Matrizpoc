import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse, readDocsRequestBody } from "../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const actor = getDocsActorContextFromRequest(request)
    const exports = await makeDocsRepository().listExports(actor)
    return NextResponse.json({ ok: true, exports })
  } catch (error) {
    return docsErrorResponse(error, 500)
  }
}

export async function POST(request: Request) {
  try {
    const actor = getDocsActorContextFromRequest(request)
    const body = await readDocsRequestBody(request)
    const artifact = await makeDocsRepository().generateExport(actor, {
      targetType: String(body.targetType ?? "document") as never,
      targetId: String(body.targetId ?? ""),
      exportType: String(body.exportType ?? "markdown") as never,
      visibility: String(body.visibility ?? "internal") as never,
    })
    return NextResponse.json({ ok: true, artifact }, { status: 201 })
  } catch (error) {
    return docsErrorResponse(error)
  }
}
