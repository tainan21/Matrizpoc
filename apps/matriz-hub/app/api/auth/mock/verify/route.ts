import { authRateLimitedResponse, mockAuthOriginRejected, mockAuthState, preflight, sessionResponse, resultResponse } from "../../../../../src/auth/mock-auth-server"
import { isAllowedMockAuthOrigin } from "../../../../../src/auth/mock-auth-cors"
import { allowHubRequest } from "../../../../../src/auth/hub-session"
import { readBoundedText } from "../../../../../src/http/bounded-body"

export const OPTIONS = preflight
export async function POST(request: Request) {
  if (!isAllowedMockAuthOrigin(request.headers.get("origin")) || !request.headers.get("origin")) return mockAuthOriginRejected(request)
  const body = await readBoundedText(request, 8 * 1024).then((text) => JSON.parse(text || "{}") as { method?: "otp" | "magic-link"; challengeId?: string; code?: string; token?: string }).catch(() => null)
  if (!body) return resultResponse(request, { ok: false, error: { code: "invalid-input", message: "Corpo invalido." } })
  if (!allowHubRequest(`auth:verify:${body.challengeId ?? body.token ?? "invalid"}`, Date.now(), 5)) return authRateLimitedResponse(request)
  const result = body.method === "otp"
    ? mockAuthState.verifyOtp(body.challengeId ?? "", body.code ?? "")
    : body.method === "magic-link"
      ? mockAuthState.verifyMagicLink(body.token ?? "")
      : { ok: false as const, error: { code: "invalid-input" as const, message: "Metodo de verificacao invalido." } }
  return result.ok ? sessionResponse(request, result.value) : resultResponse(request, result)
}
