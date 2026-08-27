import { describe, expect, it, vi } from "vitest"
import { CelcoinAdapter, verifyCelcoinWebhookAuthorization } from "./celcoin-adapter"

describe("Celcoin adapter contract", () => {
  it("gets OAuth client_credentials token and authenticates BaaS calls", async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/v5/token")) return Response.json({ access_token: "access_123", expires_in: 2400, token_type: "bearer" })
      return Response.json({ body: { balance: 1250 }, status: "SUCCESS" })
    })
    const adapter = new CelcoinAdapter({ baseUrl: "https://sandbox.openfinance.celcoin.dev", clientId: "client", clientSecret: "secret", fetcher })
    await adapter.getBalance("account_1")
    expect(fetcher).toHaveBeenNthCalledWith(1, "https://sandbox.openfinance.celcoin.dev/v5/token", expect.objectContaining({ method: "POST" }))
    expect(fetcher).toHaveBeenNthCalledWith(2, "https://sandbox.openfinance.celcoin.dev/baas/v2/wallet/balance?Account=account_1", expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer access_123" }) }))
  })

  it("fails closed when production was not explicitly homologated", () => {
    expect(() => new CelcoinAdapter({ baseUrl: "https://api.openfinance.celcoin.com.br", clientId: "client", clientSecret: "secret", fetcher: vi.fn(), productionApproved: false })).toThrow("homologation")
  })

  it("verifies webhook Basic authentication without exposing credentials", () => {
    const header = `Basic ${Buffer.from("matriz:webhook-secret").toString("base64")}`
    expect(verifyCelcoinWebhookAuthorization(header, "matriz:webhook-secret")).toBe(true)
    expect(verifyCelcoinWebhookAuthorization(header, "matriz:wrong-secret")).toBe(false)
  })

  it("converts provider decimal balance to integer cents from the raw response", async () => {
    const fetcher = vi.fn(async (url: string) => url.endsWith("/v5/token") ? Response.json({ access_token: "access_123" }) : new Response('{"status":"SUCCESS","body":{"balance":12.50}}', { headers: { "content-type": "application/json" } }))
    const adapter = new CelcoinAdapter({ baseUrl: "https://sandbox.openfinance.celcoin.dev", clientId: "client", clientSecret: "secret", fetcher })
    await expect(adapter.getBalanceMinor("account_1")).resolves.toBe(1250n)
  })
})
