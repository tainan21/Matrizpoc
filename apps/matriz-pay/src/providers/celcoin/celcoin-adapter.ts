import { timingSafeEqual } from "node:crypto"

type CelcoinFetch = (input: string, init?: RequestInit) => Promise<Response>
export interface CelcoinConfig {
  readonly baseUrl: string
  readonly clientId: string
  readonly clientSecret: string
  readonly fetcher?: CelcoinFetch
  readonly productionApproved?: boolean
}

export function verifyCelcoinWebhookAuthorization(header: string | null, expectedCredentials: string): boolean {
  if (!header?.startsWith("Basic ") || !expectedCredentials) return false
  let decoded = ""
  try { decoded = Buffer.from(header.slice(6), "base64").toString("utf8") } catch { return false }
  const left = Buffer.from(decoded)
  const right = Buffer.from(expectedCredentials)
  return left.length === right.length && timingSafeEqual(left, right)
}

export class CelcoinAdapter {
  private readonly baseUrl: string
  private readonly fetcher: CelcoinFetch
  private token: { value: string; expiresAt: number } | undefined

  constructor(private readonly config: CelcoinConfig) {
    this.baseUrl = new URL(config.baseUrl).toString().replace(/\/$/, "")
    this.fetcher = config.fetcher ?? fetch
    const production = new URL(this.baseUrl).hostname === "api.openfinance.celcoin.com.br"
    if (production && !config.productionApproved) throw new Error("Celcoin production requires contract and homologation approval")
    if (!config.clientId || !config.clientSecret) throw new Error("Celcoin credentials are required")
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value
    const form = new FormData()
    form.set("client_id", this.config.clientId)
    form.set("client_secret", this.config.clientSecret)
    form.set("grant_type", "client_credentials")
    const response = await this.fetcher(`${this.baseUrl}/v5/token`, { method: "POST", body: form, headers: { accept: "application/json" } })
    if (!response.ok) throw new Error(`Celcoin OAuth unavailable (${response.status})`)
    const body = await response.json() as { access_token?: string; expires_in?: number }
    if (!body.access_token) throw new Error("Celcoin OAuth returned no access token")
    this.token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 2400) * 1000 }
    return body.access_token
  }

  private async response(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.accessToken()
    const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers: { accept: "application/json", authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers } })
    if (!response.ok) throw new Error(`Celcoin request failed (${response.status})`)
    return response
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    return (await this.response(path, init)).json()
  }

  getBalance(account: string): Promise<unknown> {
    return this.request(`/baas/v2/wallet/balance?Account=${encodeURIComponent(account)}`)
  }

  async getBalanceMinor(account: string): Promise<bigint> {
    const raw = await (await this.response(`/baas/v2/wallet/balance?Account=${encodeURIComponent(account)}`)).text()
    const value = raw.match(/"(?:availableBalance|balance)"\s*:\s*"?(-?\d+(?:\.\d{1,2})?)"?/i)?.[1]
    if (!value) throw new Error("Celcoin balance response has no exact decimal balance")
    const negative = value.startsWith("-")
    const [units, rawCents = ""] = value.replace("-", "").split(".") as [string, string?]
    const minor = BigInt(units) * 100n + BigInt(rawCents.padEnd(2, "0"))
    return negative ? -minor : minor
  }

  getStatement(account: string, dateFrom: string, dateTo: string): Promise<unknown> {
    return this.request(`/baas/v2/wallet/power-movement?Account=${encodeURIComponent(account)}&DateFrom=${encodeURIComponent(dateFrom)}&DateTo=${encodeURIComponent(dateTo)}`)
  }

  createPixOut(payload: Record<string, unknown>): Promise<unknown> {
    return this.request("/baas/v2/pix/payment", { method: "POST", body: JSON.stringify(payload) })
  }

  lookupExternalPixKey(key: string): Promise<unknown> {
    return this.request(`/baas/v2/pix/dict/entry/external/${encodeURIComponent(key)}`)
  }

  createPixOutMinor(payload: Record<string, unknown>, amountMinor: bigint): Promise<unknown> {
    if (amountMinor <= 0n) throw new Error("amountMinor must be positive")
    const marker = "__MATRIZ_EXACT_AMOUNT__"
    const units = amountMinor / 100n
    const cents = (amountMinor % 100n).toString().padStart(2, "0")
    const body = JSON.stringify({ ...payload, amount: marker }).replace(`"${marker}"`, `${units}.${cents}`)
    return this.request("/baas/v2/pix/payment", { method: "POST", body })
  }

  createNaturalPersonProposal(payload: Record<string, unknown>): Promise<unknown> {
    return this.request("/onboarding/v1/onboarding-proposal/natural-person", { method: "POST", body: JSON.stringify(payload) })
  }

  checkAccount(input: { onboardingId?: string; clientCode?: string }): Promise<unknown> {
    const query = new URLSearchParams()
    if (input.onboardingId) query.set("onboardingId", input.onboardingId)
    if (input.clientCode) query.set("clientCode", input.clientCode)
    if (!query.size) throw new Error("onboardingId or clientCode is required")
    return this.request(`/baas/v2/account/check?${query}`)
  }
}
