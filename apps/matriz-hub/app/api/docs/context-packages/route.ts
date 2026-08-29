import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse, docsRedirect, readDocsRequestBody, wantsHtmlRedirect } from "../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const actor = await getDocsActorContextFromRequest(request)
    const contexts = await makeDocsRepository().listContextPackages(actor)
    return NextResponse.json({ ok: true, contexts })
  } catch (error) {
    return docsErrorResponse(error, 500)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getDocsActorContextFromRequest(request)
    const body = await readDocsRequestBody(request)
    const documentIds = typeof body.documentIds === "string"
      ? body.documentIds.split(",").map((x) => x.trim()).filter(Boolean)
      : []
    const context = await makeDocsRepository().createContextPackage(actor, {
      title: String(body.title ?? "Context package"),
      audience: String(body.audience ?? "internal"),
      visibility: String(body.visibility ?? "internal") as never,
      description: typeof body.description === "string" ? body.description : undefined,
      documentIds,
    })
    if (wantsHtmlRedirect(request)) return docsRedirect(request, `/docs/context/${context.id}`)
    return NextResponse.json({ ok: true, context }, { status: 201 })
  } catch (error) {
    return docsErrorResponse(error)
  }
}
