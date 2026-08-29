import { NextResponse } from "next/server"
import { getDocsActorContextFromRequest } from "../../../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../../../src/domains/docs/integration/prisma/docs-repository"
import { docsErrorResponse, docsRedirect, wantsHtmlRedirect } from "../../../_helpers"
export const runtime = "nodejs"; export const dynamic = "force-dynamic"
interface Ctx { params: Promise<{ id: string }> }
export async function POST(request: Request, { params }: Ctx) { try { const { id } = await params; const actor = await getDocsActorContextFromRequest(request); const suggestion = await makeDocsRepository().reviewSuggestion(actor, id, "accepted"); if (wantsHtmlRedirect(request)) return docsRedirect(request, "/docs/suggestions"); return NextResponse.json({ ok: true, suggestion }) } catch (error) { return docsErrorResponse(error) } }
