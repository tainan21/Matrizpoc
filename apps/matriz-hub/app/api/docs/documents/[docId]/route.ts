import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse, readDocsRequestBody } from "../../_helpers"
export const runtime = "nodejs"; export const dynamic = "force-dynamic"
interface Ctx { params: Promise<{ docId: string }> }
export async function GET(request: Request, { params }: Ctx) { try { const { docId } = await params; const actor = await getDocsActorContextFromRequest(request); const doc = await makeDocsRepository().getDocument(actor, docId); if (!doc) return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 }); return NextResponse.json({ ok: true, document: doc }) } catch (error) { return docsErrorResponse(error, 500) } }
export async function PATCH(request: Request, { params }: Ctx) { try { const { docId } = await params; const actor = await getDocsActorContextFromRequest(request); const body = await readDocsRequestBody(request); const doc = await makeDocsRepository().updateDocumentDraft(actor, { documentId: docId, title: typeof body.title === "string" ? body.title : undefined, content: String(body.content ?? ""), changeReason: typeof body.changeReason === "string" ? body.changeReason : undefined }); return NextResponse.json({ ok: true, document: doc }) } catch (error) { return docsErrorResponse(error) } }
export async function POST(request: Request, ctx: Ctx) { return PATCH(request, ctx) }
