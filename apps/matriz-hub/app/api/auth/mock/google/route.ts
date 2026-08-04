import { mockAuthState, preflight, sessionResponse, resultResponse } from "../../../../../src/auth/mock-auth-server"

export const OPTIONS = preflight
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { accountId?: string }
  const result = mockAuthState.signInWithGoogle(body.accountId ?? "")
  return result.ok ? sessionResponse(request, result.value) : resultResponse(request, result)
}
