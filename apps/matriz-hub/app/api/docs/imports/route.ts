import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse, docsRedirect, readDocsRequestBody, wantsHtmlRedirect } from "../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const actor = getDocsActorContextFromRequest(request)
    const body = await readDocsRequestBody(request)
    const doc = await makeDocsRepository().importDocument(actor, {
      title: String(body.title ?? "Import MatrizDocs"),
      content: String(body.content ?? ""),
      type: String(body.type ?? "institutional") as never,
      visibility: String(body.visibility ?? "internal") as never,
      sourceKind: String(body.sourceKind ?? "pasted_text"),
      originalFileName: typeof body.originalFileName === "string" ? body.originalFileName : undefined,
      mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
    })
    if (wantsHtmlRedirect(request)) return docsRedirect(request, `/docs/${doc.id}`)
    return NextResponse.json({ ok: true, document: doc }, { status: 201 })
  } catch (error) {
    return docsErrorResponse(error)
  }
}
