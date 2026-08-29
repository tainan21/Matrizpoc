import type { MatrizAppId } from "@matriz/foundation-constants"
import type { AuthChallenge, ChallengeMethod, SharedAuthSession } from "./mock-auth"
import type { AuthSession } from "../types"

export interface MockAuthBroker {
  startChallenge(method: ChallengeMethod, email: string): Promise<AuthChallenge>
  verifyOtp(challengeId: string, code: string): Promise<AuthSession>
  verifyMagicLink(token: string): Promise<AuthSession>
  signInWithGoogle(accountId: string): Promise<AuthSession>
  signInWithEmail(email: string): Promise<AuthSession>
  restoreSession(): Promise<SharedAuthSession | null>
  recordAppOpen(appId: MatrizAppId): Promise<void>
  signOut(): Promise<void>
  switchTenant?(tenantId: string): Promise<AuthSession>
}

interface BrokerErrorBody { error?: { message?: string } }

export function createHttpMockAuthBroker(baseUrl: string): MockAuthBroker {
  const root = `${baseUrl.replace(/\/$/, "")}/api/auth/mock`
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${root}${path}`, {
        ...init,
        credentials: "include",
        headers: { "content-type": "application/json", ...init?.headers },
        cache: "no-store",
      })
    } catch {
      throw new Error("O Hub de autenticacao esta indisponivel. Inicie-o em localhost:3000 e tente novamente.")
    }
    if (response.status === 401 && path === "/session" && (!init?.method || init.method === "GET")) return null as T
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as BrokerErrorBody
      throw new Error(body.error?.message ?? "O Hub de autenticacao esta indisponivel.")
    }
    if (response.status === 204) return undefined as T
    return await response.json() as T
  }
  const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) })
  return {
    startChallenge: (method, email) => post("/challenge", { method, email }),
    verifyOtp: (challengeId, code) => post("/verify", { method: "otp", challengeId, code }),
    verifyMagicLink: (token) => post("/verify", { method: "magic-link", token }),
    signInWithGoogle: (accountId) => post("/google", { accountId }),
    signInWithEmail: (email) => post("/email", { email }),
    restoreSession: () => request("/session"),
    recordAppOpen: (appId) => post("/session", { appId }),
    signOut: () => request("/session", { method: "DELETE" }),
    switchTenant: async () => { throw new Error("Tenant switch is unavailable in the development mock") },
  }
}
