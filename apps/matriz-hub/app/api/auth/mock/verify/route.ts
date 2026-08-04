import { mockAuthState, preflight, sessionResponse, resultResponse } from "../../../../../src/auth/mock-auth-server"

export const OPTIONS = preflight
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { method?: "otp" | "magic-link"; challengeId?: string; code?: string; token?: string }
  const result = body.method === "otp"
    ? mockAuthState.verifyOtp(body.challengeId ?? "", body.code ?? "")
    : body.method === "magic-link"
      ? mockAuthState.verifyMagicLink(body.token ?? "")
      : { ok: false as const, error: { code: "invalid-input" as const, message: "Metodo de verificacao invalido." } }
  return result.ok ? sessionResponse(request, result.value) : resultResponse(request, result)
}
