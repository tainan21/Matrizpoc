import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse, docsRedirect, wantsHtmlRedirect } from "../../../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface Ctx {
  params: Promise<{ docId: string }>
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { docId } = await params
    const actor = getDocsActorContextFromRequest(request)
    const doc = await makeDocsRepository().publishDocumentVersion(actor, docId)
    if (wantsHtmlRedirect(request)) return docsRedirect(request, `/docs/${doc.id}/versions`)
    return NextResponse.json({ ok: true, document: doc })
  } catch (error) {
    return docsErrorResponse(error)
  }
}
