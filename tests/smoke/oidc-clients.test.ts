import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createOidcAuthorizationRequest, oidcSessionCookieOptions } from "@matriz/platform-auth/server"

<<<<<<< HEAD
const apps = ["matriz-hub", "spot", "seumei", "contracts", "willdash"] as const
=======
const apps = [
  { directory: "matriz-hub", appId: "matriz-hub" },
  { directory: "spot", appId: "spot" },
  { directory: "seumeiapp", appId: "seumei" },
  { directory: "contracts", appId: "contracts" },
  { directory: "willdash", appId: "willdash" },
] as const
>>>>>>> 58d541de05392a0560f6f35d81006a28a902c4e6
const config = { issuer: "https://identity.example.test", clientId: "spot-web", clientSecret: "x".repeat(32), appId: "spot", callbackUrl: "https://spot.example.test/api/auth/oidc/callback", sessionSecret: "y".repeat(32) }

describe("OIDC app BFF conformance", () => {
  it("creates a bounded authorization-code request with S256, state and nonce", async () => {
    const result = await createOidcAuthorizationRequest(config, "//attacker.example")
    const url = new URL(result.authorizationUrl)
    expect(url.searchParams.get("response_type")).toBe("code")
    expect(url.searchParams.get("code_challenge_method")).toBe("S256")
    expect(url.searchParams.get("state")).toHaveLength(32)
    expect(url.searchParams.get("nonce")).toHaveLength(32)
    expect(url.searchParams.get("scope")).toContain("matriz_access")
    expect(result.correlationCookie).not.toContain("attacker")
  })

  it("uses a host-only JavaScript-inaccessible cookie", () => {
    expect(oidcSessionCookieOptions()).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/" })
  })

<<<<<<< HEAD
  it.each(apps)("cuts %s over to its own OIDC BFF", (app) => {
    const auth = readFileSync(resolve(`apps/${app}/src/auth/config.ts`), "utf8")
    expect(auth).toContain("createConfiguredAuthBroker")
    expect(auth).not.toContain("createHttpMockAuthBroker")
    for (const route of ["login", "callback", "session", "tenant"]) expect(existsSync(resolve(`apps/${app}/app/api/auth/oidc/${route}/route.ts`))).toBe(true)
    const server = readFileSync(resolve(`apps/${app}/src/auth/oidc.server.ts`), "utf8")
    expect(server).toContain(`appId: "${app}"`)
=======
  it.each(apps)("cuts $appId over to its own OIDC BFF", ({ directory, appId }) => {
    const auth = readFileSync(resolve(`apps/${directory}/src/auth/config.ts`), "utf8")
    expect(auth).toContain("createConfiguredAuthBroker")
    expect(auth).not.toContain("createHttpMockAuthBroker")
    for (const route of ["login", "callback", "session", "tenant"]) expect(existsSync(resolve(`apps/${directory}/app/api/auth/oidc/${route}/route.ts`))).toBe(true)
    const server = readFileSync(resolve(`apps/${directory}/src/auth/oidc.server.ts`), "utf8")
    expect(server).toContain(`appId: "${appId}"`)
>>>>>>> 58d541de05392a0560f6f35d81006a28a902c4e6
    expect(server).not.toContain("apps/")
  })
})
