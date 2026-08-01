import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse, docsRedirect, wantsHtmlRedirect } from "../../../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Ctx {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const actor = getDocsActorContextFromRequest(request)
    const context = await makeDocsRepository().publishContextPackage(actor, id)
    if (wantsHtmlRedirect(request)) return docsRedirect(request, `/docs/context/${context.id}`)
    return NextResponse.json({ ok: true, context })
  } catch (error) {
    return docsErrorResponse(error)
  }
}
