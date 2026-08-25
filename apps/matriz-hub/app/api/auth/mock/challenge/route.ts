import { authRateLimitedResponse, mockAuthOriginRejected, mockAuthState, preflight, resultResponse } from "../../../../../src/auth/mock-auth-server"
import { isAllowedMockAuthOrigin } from "../../../../../src/auth/mock-auth-cors"
import { allowHubRequest } from "../../../../../src/auth/hub-session"
import { readBoundedText } from "../../../../../src/http/bounded-body"

export const OPTIONS = preflight
export async function POST(request: Request) {
  if (!isAllowedMockAuthOrigin(request.headers.get("origin")) || !request.headers.get("origin")) return mockAuthOriginRejected(request)
  const body = await readBoundedText(request, 8 * 1024).then((text) => JSON.parse(text || "{}") as { method?: "otp" | "magic-link"; email?: string }).catch(() => null)
  if (!body) return resultResponse(request, { ok: false, error: { code: "invalid-input", message: "Corpo invalido." } })
  if (!allowHubRequest(`auth:challenge:${body.email?.trim().toLowerCase() ?? "invalid"}`, Date.now(), 5)) return authRateLimitedResponse(request)
  if (body.method !== "otp" && body.method !== "magic-link") {
    return resultResponse(request, { ok: false, error: { code: "invalid-input", message: "Metodo de desafio invalido." } })
  }
  return resultResponse(request, mockAuthState.startChallenge(body.method, body.email ?? ""))
}
