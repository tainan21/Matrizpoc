import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse, readDocsRequestBody } from "../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const actor = await getDocsActorContextFromRequest(request)
    const status = new URL(request.url).searchParams.get("status") ?? undefined
    const suggestions = await makeDocsRepository().listSuggestions(actor, status)
    return NextResponse.json({ ok: true, suggestions })
  } catch (error) {
    return docsErrorResponse(error, 500)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getDocsActorContextFromRequest(request)
    const body = await readDocsRequestBody(request)
    const suggestion = await makeDocsRepository().createSuggestion(actor, {
      type: String(body.type ?? "document_patch") as never,
      title: String(body.title ?? "Sugestao MatrizDocs"),
      description: String(body.description ?? ""),
      targetType: String(body.targetType ?? "document"),
      targetId: String(body.targetId ?? ""),
      confidence: typeof body.confidence === "number" ? body.confidence : undefined,
      evidence: { source: "api", body },
    })
    return NextResponse.json({ ok: true, suggestion }, { status: 201 })
  } catch (error) {
    return docsErrorResponse(error)
  }
}
