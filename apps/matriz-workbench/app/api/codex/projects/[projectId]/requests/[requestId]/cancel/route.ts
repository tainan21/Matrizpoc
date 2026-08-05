import { type NextRequest, NextResponse } from "next/server"
import { getCodexRunManager } from "../../../../../../../../src/application/codex-run-manager"
import { apiError } from "@/src/application/http/api-error"
import { authorizeApiRequest } from "@/src/auth/api-session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; requestId: string }> },
) {
  const denied = await authorizeApiRequest(request, true)
  if (denied) return denied
  try {
    const { projectId, requestId } = await params
    return NextResponse.json(await getCodexRunManager().cancel(projectId, requestId))
  } catch (error) {
    return apiError(error)
  }
}
