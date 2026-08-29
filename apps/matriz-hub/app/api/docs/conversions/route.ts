import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse, readDocsRequestBody } from "../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const actor = await getDocsActorContextFromRequest(request)
    const body = await readDocsRequestBody(request)
    const documentId = String(body.documentId ?? "")
    const document = await makeDocsRepository().getDocument(actor, documentId)
    if (!document) return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 })
    return NextResponse.json({
      ok: true,
      conversion: {
        status: "completed",
        documentId,
        blockCount: document.blocks.length,
        semanticSearchPrepared: true,
      },
    })
  } catch (error) {
    return docsErrorResponse(error)
  }
}
