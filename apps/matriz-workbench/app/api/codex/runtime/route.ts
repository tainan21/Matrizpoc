import { type NextRequest, NextResponse } from "next/server"
import { getCodexRunManager } from "../../../../src/application/codex-run-manager"
import { apiError } from "@/src/application/http/api-error"
import { authorizeApiRequest } from "@/src/auth/api-session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const denied = await authorizeApiRequest(request)
  if (denied) return denied
  try {
    return NextResponse.json(await getCodexRunManager().runtimeInfo())
  } catch (error) {
    return apiError(error)
  }
}
