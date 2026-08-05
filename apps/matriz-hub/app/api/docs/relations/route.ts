import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse, readDocsRequestBody } from "../_helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const actor = getDocsActorContextFromRequest(request)
    const relations = await makeDocsRepository().listKnowledgeEdges(actor)
    return NextResponse.json({ ok: true, relations })
  } catch (error) {
    return docsErrorResponse(error, 500)
  }
}

export async function POST(request: Request) {
  try {
    const actor = getDocsActorContextFromRequest(request)
    const body = await readDocsRequestBody(request)
    const relation = await makeDocsRepository().createKnowledgeEdge(actor, {
      sourceNodeId: String(body.sourceNodeId ?? ""),
      targetNodeId: String(body.targetNodeId ?? ""),
      relationType: String(body.relationType ?? "mentions") as never,
      status: String(body.status ?? "suggested") as never,
      confidence: typeof body.confidence === "number" ? body.confidence : undefined,
      evidence: { source: "api", body },
    })
    return NextResponse.json({ ok: true, relation }, { status: 201 })
  } catch (error) {
    return docsErrorResponse(error)
  }
}
