import { describe, expect, it, vi } from "vitest"
import { loadSeumeiPortfolio } from "./load-seumei-portfolio"

const payload = {
  generatedAt: "2026-08-24T12:00:00.000Z",
  companies: [{ companyId: "company-a", name: "Galaxia Burger", slug: "galaxia-burger", status: "ACTIVE", role: "OWNER", todayRevenueCents: 12000, liveOrderCount: 2, lowStockIngredientCount: 1, workspaceUrl: "/enter/company-a" }],
  totals: { companyCount: 1, todayRevenueCents: 12000, liveOrderCount: 2, lowStockIngredientCount: 1 },
}

describe("loadSeumeiPortfolio", () => {
  it("forwards the HTTP-only session server-side and validates the public DTO", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => payload })
    await expect(loadSeumeiPortfolio("matriz_mock_session=opaque", fetcher, "http://seumei.test"))
      .resolves.toEqual({ kind: "ready", portfolio: payload })
    expect(fetcher).toHaveBeenCalledWith("http://seumei.test/api/public/v1/portfolio", {
      headers: { cookie: "matriz_mock_session=opaque" },
      cache: "no-store",
    })
  })

  it("distinguishes signed out from unavailable or malformed upstream", async () => {
    await expect(loadSeumeiPortfolio("", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => null }), "http://seumei.test"))
      .resolves.toEqual({ kind: "signed-out" })
    await expect(loadSeumeiPortfolio("sid=x", vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => null }), "http://seumei.test"))
      .resolves.toEqual({ kind: "unavailable" })
    await expect(loadSeumeiPortfolio("sid=x", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ companies: "leak" }) }), "http://seumei.test"))
      .resolves.toEqual({ kind: "unavailable" })
  })

  it("sanitizes transport failures", async () => {
    await expect(loadSeumeiPortfolio("sid=x", vi.fn().mockRejectedValue(new Error("secret URL")), "http://seumei.test"))
      .resolves.toEqual({ kind: "unavailable" })
  })
})
