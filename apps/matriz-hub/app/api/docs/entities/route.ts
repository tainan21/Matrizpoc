import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse, docsRedirect, readDocsRequestBody, wantsHtmlRedirect } from "../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const actor = getDocsActorContextFromRequest(request)
    const entities = await makeDocsRepository().listKnowledgeNodes(actor)
    return NextResponse.json({ ok: true, entities })
  } catch (error) {
    return docsErrorResponse(error, 500)
  }
}

export async function POST(request: Request) {
  try {
    const actor = getDocsActorContextFromRequest(request)
    const body = await readDocsRequestBody(request)
    const entity = await makeDocsRepository().createKnowledgeNode(actor, {
      name: String(body.name ?? ""),
      type: String(body.type ?? "concept"),
      description: typeof body.description === "string" ? body.description : undefined,
    })
    if (wantsHtmlRedirect(request)) return docsRedirect(request, `/docs/entities/${entity.id}`)
    return NextResponse.json({ ok: true, entity }, { status: 201 })
  } catch (error) {
    return docsErrorResponse(error)
  }
}
