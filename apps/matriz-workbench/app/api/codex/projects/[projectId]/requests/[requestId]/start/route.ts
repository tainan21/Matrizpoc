import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCodexRunManager } from "../../../../../../../../src/application/codex-run-manager"
import { apiError } from "@/src/application/http/api-error"
import { authorizeApiRequest } from "@/src/auth/api-session"
import { getLocalRateLimiter } from "../../../../../../../../src/auth/local-rate-limiter"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const inputSchema = z.object({ revision: z.string().min(8) })

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; requestId: string }> },
) {
  const denied = await authorizeApiRequest(request, true)
  if (denied) return denied
  const rateLimit = getLocalRateLimiter().consume("codex-start", {
    limit: 12,
    windowMs: 60_000,
  })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Muitas inicializações do Codex. Aguarde antes de tentar novamente.",
        code: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    )
  }
  try {
    const { projectId, requestId } = await params
    const input = inputSchema.parse(await request.json())
    const run = await getCodexRunManager().start(projectId, requestId, input.revision)
    return NextResponse.json(run, { status: 202 })
  } catch (error) {
    return apiError(error)
  }
}
