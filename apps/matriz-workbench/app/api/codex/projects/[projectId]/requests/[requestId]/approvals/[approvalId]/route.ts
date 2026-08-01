import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCodexRunManager } from "../../../../../../../../../src/application/codex-run-manager"
import { apiError } from "@/src/application/http/api-error"
import { authorizeApiRequest } from "@/src/auth/api-session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const inputSchema = z.object({
  decision: z.enum(["accept", "accept_for_session", "decline", "cancel"]),
})

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string; requestId: string; approvalId: string }>
  },
) {
  const denied = await authorizeApiRequest(request, true)
  if (denied) return denied
  try {
    const { projectId, requestId, approvalId } = await params
    const input = inputSchema.parse(await request.json())
    return NextResponse.json(
      await getCodexRunManager().resolveApproval(
        projectId,
        requestId,
        approvalId,
        input.decision,
      ),
    )
  } catch (error) {
    return apiError(error)
  }
}
