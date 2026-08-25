import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { buildContentSecurityPolicy as buildHubPolicy } from "../../apps/matriz-hub/src/security/content-security-policy"
import { trustedConnectOrigins as hubConnectOrigins } from "../../apps/matriz-hub/src/security/content-security-policy"
import { buildContentSecurityPolicy as buildSpotPolicy } from "../../apps/spot/src/security/content-security-policy"
import { trustedConnectOrigins as spotConnectOrigins } from "../../apps/spot/src/security/content-security-policy"
import { buildContentSecurityPolicy as buildSeumeiPolicy } from "../../apps/seumeiapp/src/security/content-security-policy"
import { trustedConnectOrigins as seumeiConnectOrigins } from "../../apps/seumeiapp/src/security/content-security-policy"
import { buildContentSecurityPolicy as buildContractsPolicy } from "../../apps/contracts/src/security/content-security-policy"
import { trustedConnectOrigins as contractsConnectOrigins } from "../../apps/contracts/src/security/content-security-policy"
import { buildContentSecurityPolicy as buildWilldashPolicy } from "../../apps/willdash/src/security/content-security-policy"
import { trustedConnectOrigins as willdashConnectOrigins } from "../../apps/willdash/src/security/content-security-policy"
import { buildContentSecurityPolicy as buildSitesPolicy } from "../../apps/sites/src/security/content-security-policy"
import { trustedConnectOrigins as sitesConnectOrigins } from "../../apps/sites/src/security/content-security-policy"
import { proxy as hubProxy, config as hubProxyConfig } from "../../apps/matriz-hub/proxy"
import { proxy as spotProxy } from "../../apps/spot/proxy"
import { proxy as seumeiProxy } from "../../apps/seumeiapp/proxy"
import { proxy as contractsProxy } from "../../apps/contracts/proxy"
import { proxy as willdashProxy } from "../../apps/willdash/proxy"
import { proxy as sitesProxy, config as sitesProxyConfig } from "../../apps/sites/proxy"
import { OPTIONS as mockAuthOptions } from "../../apps/matriz-hub/app/api/auth/mock/session/route"
import { OPTIONS as sharedCacheOptions } from "../../apps/matriz-hub/app/api/ecosystem/cache/route"
import hubNextConfig from "../../apps/matriz-hub/next.config.mjs"
import sitesNextConfig from "../../apps/sites/next.config.mjs"

const nonce = "MDEyMzQ1Njc4OWFiY2RlZg=="

const policies = [
  ["matriz-hub", buildHubPolicy],
  ["spot", buildSpotPolicy],
  ["seumei", buildSeumeiPolicy],
  ["contracts", buildContractsPolicy],
  ["willdash", buildWilldashPolicy],
  ["sites", buildSitesPolicy],
] as const

function directiveSources(policy: string, directive: string): string[] {
  const value = policy.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${directive} `))
  return value?.split(/\s+/).slice(1) ?? []
}

describe("Next security baseline", () => {
  it.each(policies)("enforces a nonce-backed production script policy for %s", (_app, buildPolicy) => {
    const policy = buildPolicy(nonce)

    expect(directiveSources(policy, "script-src")).toEqual([
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
    ])
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("base-uri 'self'")
    expect(policy).toContain("frame-ancestors 'none'")
    expect(directiveSources(policy, "script-src")).not.toContain("'unsafe-inline'")
    expect(directiveSources(policy, "script-src")).not.toContain("'unsafe-eval'")
  })

  it.each(policies)("only enables eval for the local development runtime in %s", (_app, buildPolicy) => {
    expect(buildPolicy(nonce, { development: true })).toContain("'unsafe-eval'")
    expect(buildPolicy(nonce)).not.toContain("'unsafe-eval'")
  })

  it.each(policies)("rejects an injected nonce in %s", (_app, buildPolicy) => {
    expect(() => buildPolicy("bad nonce; script-src *")).toThrow("Invalid CSP nonce.")
  })

  it("derives Hub and Spot cross-origin connections from trusted server-side configuration", () => {
    expect(hubConnectOrigins({ NODE_ENV: "development" })).toEqual([
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:3004",
      "http://127.0.0.1:3005",
      "http://127.0.0.1:3006",
    ])
    expect(spotConnectOrigins({
      NODE_ENV: "production",
      MATRIZ_HUB_ORIGIN: "https://hub.matriz.example",
      MATRIZ_CONTRACTS_ORIGIN: "https://contracts.matriz.example",
    })).toEqual([
      "https://hub.matriz.example",
      "https://contracts.matriz.example",
    ])
    expect(() => spotConnectOrigins({
      NODE_ENV: "production",
      MATRIZ_HUB_ORIGIN: "https://hub.matriz.example/login",
      MATRIZ_CONTRACTS_ORIGIN: "https://contracts.matriz.example",
    }))
      .toThrow("Invalid trusted connect origin.")
  })

  it.each([
    ["matriz-hub", hubConnectOrigins, {
      MATRIZ_SPOT_ORIGIN: "https://spot.matriz.example",
      MATRIZ_SEUMEI_ORIGIN: "https://seumei.matriz.example",
      MATRIZ_CONTRACTS_ORIGIN: "https://contracts.matriz.example",
      MATRIZ_WILLDASH_ORIGIN: "https://willdash.matriz.example",
      MATRIZ_WORKBENCH_ORIGIN: "https://workbench.matriz.example",
      MATRIZ_SITES_ORIGIN: "https://sites.matriz.example",
    }],
    ["spot", spotConnectOrigins, { MATRIZ_HUB_ORIGIN: "https://hub.matriz.example", MATRIZ_CONTRACTS_ORIGIN: "https://contracts.matriz.example" }],
    ["seumei", seumeiConnectOrigins, { MATRIZ_HUB_ORIGIN: "https://hub.matriz.example", MATRIZ_CONTRACTS_ORIGIN: "https://contracts.matriz.example" }],
    ["contracts", contractsConnectOrigins, { MATRIZ_HUB_ORIGIN: "https://hub.matriz.example" }],
    ["willdash", willdashConnectOrigins, { MATRIZ_HUB_ORIGIN: "https://hub.matriz.example" }],
    ["sites", sitesConnectOrigins, { MATRIZ_HUB_ORIGIN: "https://hub.matriz.example" }],
  ] as const)("rejects missing and localhost deployment origins for %s", (_app, origins, deployment) => {
    expect(() => origins({ NODE_ENV: "production" })).toThrow("Missing required trusted connect origin.")
    const invalidDeployment = { ...deployment }
    if ("MATRIZ_HUB_ORIGIN" in invalidDeployment) invalidDeployment.MATRIZ_HUB_ORIGIN = "http://localhost:3000"
    else invalidDeployment.MATRIZ_SPOT_ORIGIN = "http://localhost:3001"
    expect(() => origins({ NODE_ENV: "production", ...invalidDeployment })).toThrow("Invalid trusted connect origin.")
  })

  it("passes a request nonce through Hub proxy responses and keeps tenant responses private", () => {
    const response = hubProxy(new NextRequest("http://localhost:3000/telemetry"))
    const policy = response.headers.get("Content-Security-Policy")
    const nonceFromRequest = response.headers.get("x-middleware-request-x-nonce")

    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(nonceFromRequest).toMatch(/^[A-Za-z0-9+/]{22}==$/)
    expect(directiveSources(policy ?? "", "script-src")).toContain(`'nonce-${nonceFromRequest}'`)
    expect(hubProxyConfig.matcher).toContain("/((?!favicon.ico).*)")
  })

  it.each([
    ["matriz-hub", hubProxy, "http://localhost:3000/telemetry"],
    ["spot", spotProxy, "http://localhost:3001/gigs"],
    ["seumei", seumeiProxy, "http://localhost:3008/"],
    ["contracts", contractsProxy, "http://localhost:3003/contracts"],
    ["willdash", willdashProxy, "http://localhost:3004/goals"],
  ] as const)("applies nonce CSP, explicit connect-src, and private cache for %s", (_app, proxy, url) => {
    const response = proxy(new NextRequest(url))
    const policy = response.headers.get("Content-Security-Policy") ?? ""
    const nonceFromRequest = response.headers.get("x-middleware-request-x-nonce")

    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(nonceFromRequest).toMatch(/^[A-Za-z0-9+/]{22}==$/)
    expect(directiveSources(policy, "script-src")).toContain(`'nonce-${nonceFromRequest}'`)
    expect(directiveSources(policy, "connect-src")).toEqual(expect.arrayContaining(["'self'"]))
    expect(directiveSources(policy, "connect-src")).not.toContain("*")
  })

  it("preserves Hub mock-auth and shared-cache allowed-origin OPTIONS responses behind the proxy policy", async () => {
    const authOrigin = "http://localhost:3001"
    const cacheOrigin = "http://127.0.0.1:3005"
    const proxyResponse = hubProxy(new NextRequest("http://localhost:3000/api/auth/mock/session", { method: "OPTIONS", headers: { origin: authOrigin } }))
    const authResponse = mockAuthOptions(new Request("http://localhost:3000/api/auth/mock/session", { method: "OPTIONS", headers: { origin: authOrigin } }))
    const cacheResponse = sharedCacheOptions(new Request("http://localhost:3000/api/ecosystem/cache", { method: "OPTIONS", headers: { origin: cacheOrigin } }))

    expect(proxyResponse.headers.get("Content-Security-Policy")).toContain("script-src")
    expect(proxyResponse.headers.get("cache-control")).toBe("private, no-store")
    expect(authResponse.status).toBe(204)
    expect(authResponse.headers.get("access-control-allow-origin")).toBe(authOrigin)
    expect(cacheResponse.status).toBe(204)
    expect(cacheResponse.headers.get("access-control-allow-origin")).toBe(cacheOrigin)
  })

  it("keeps Sites public while protecting OPTIONS with the same nonce policy", () => {
    const response = sitesProxy(new NextRequest("http://127.0.0.1:3006/preview/example/pt-BR", { method: "OPTIONS" }))

    expect(response.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=300, stale-while-revalidate=600")
    expect(response.headers.get("Content-Security-Policy")).toContain("script-src")
    expect(sitesProxyConfig.matcher).toContain("/((?!favicon.ico).*)")
  })

  it("registers baseline browser headers in the app Next configs", async () => {
    const [hubRule] = await hubNextConfig.headers()
    const [sitesRule] = await sitesNextConfig.headers()
    const expected = [
      ["X-Content-Type-Options", "nosniff"],
      ["X-Frame-Options", "DENY"],
      ["Referrer-Policy", "strict-origin-when-cross-origin"],
      ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
    ]

    for (const rule of [hubRule, sitesRule]) {
      expect(rule.source).toBe("/:path*")
      expect(rule.headers.map((header) => [header.key, header.value])).toEqual(expected)
    }
  })
})
