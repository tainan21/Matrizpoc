import { authRateLimitedResponse, mockAuthOriginRejected, mockAuthState, preflight, sessionResponse, resultResponse } from "../../../../../src/auth/mock-auth-server"
import { isAllowedMockAuthOrigin } from "../../../../../src/auth/mock-auth-cors"
import { allowHubRequest } from "../../../../../src/auth/hub-session"
import { readBoundedText } from "../../../../../src/http/bounded-body"

export const OPTIONS = preflight
export async function POST(request: Request) {
  if (!isAllowedMockAuthOrigin(request.headers.get("origin")) || !request.headers.get("origin")) return mockAuthOriginRejected(request)
  const body: { accountId?: string } = await readBoundedText(request, 8 * 1024).then((text) => JSON.parse(text || "{}") as { accountId?: string }).catch(() => ({}))
  if (!allowHubRequest(`auth:google:${body.accountId?.trim() ?? "invalid"}`, Date.now(), 5)) return authRateLimitedResponse(request)
  const result = mockAuthState.signInWithGoogle(body.accountId ?? "")
  return result.ok ? sessionResponse(request, result.value) : resultResponse(request, result)
}
