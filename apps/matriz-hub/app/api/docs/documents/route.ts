import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse, docsRedirect, readDocsRequestBody, wantsHtmlRedirect } from "../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const actor = await getDocsActorContextFromRequest(request)
    const url = new URL(request.url)
    const repo = makeDocsRepository()
    const documents = await repo.listDocuments(actor, {
      query: url.searchParams.get("query") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
    })
    return NextResponse.json({ ok: true, documents })
  } catch (error) {
    return docsErrorResponse(error, 500)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getDocsActorContextFromRequest(request)
    const body = await readDocsRequestBody(request)
    const repo = makeDocsRepository()
    const detail = await repo.createDocument(actor, {
      title: String(body.title ?? "Documento sem titulo"),
      content: String(body.content ?? ""),
      type: String(body.type ?? "institutional") as never,
      visibility: String(body.visibility ?? "internal") as never,
      projectId: typeof body.projectId === "string" && body.projectId ? body.projectId : undefined,
      description: typeof body.description === "string" && body.description ? body.description : undefined,
    })
    if (wantsHtmlRedirect(request)) return docsRedirect(request, `/docs/${detail.id}`)
    return NextResponse.json({ ok: true, document: detail }, { status: 201 })
  } catch (error) {
    return docsErrorResponse(error)
  }
}
