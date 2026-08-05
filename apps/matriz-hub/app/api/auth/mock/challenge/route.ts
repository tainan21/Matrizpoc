import { mockAuthState, preflight, resultResponse } from "../../../../../src/auth/mock-auth-server"

export const OPTIONS = preflight
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { method?: "otp" | "magic-link"; email?: string }
  if (body.method !== "otp" && body.method !== "magic-link") {
    return resultResponse(request, { ok: false, error: { code: "invalid-input", message: "Metodo de desafio invalido." } })
  }
  return resultResponse(request, mockAuthState.startChallenge(body.method, body.email ?? ""))
}
