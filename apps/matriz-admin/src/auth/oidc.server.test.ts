import { describe, expect, it } from "vitest"
import { oidcConfig } from "./oidc-config"

describe("Matriz Admin OIDC configuration", () => {
  it("uses its own confidential client and app identity", () => {
    expect(oidcConfig({
      MATRIZ_IDENTITY_ISSUER: "http://127.0.0.1:8080",
      ADMIN_OIDC_CLIENT_ID: "matriz-admin",
      ADMIN_OIDC_CLIENT_SECRET: "s".repeat(32),
      ADMIN_OIDC_CALLBACK_URL: "http://127.0.0.1:3002/api/auth/oidc/callback",
      ADMIN_SESSION_SECRET: "t".repeat(32),
    })).toMatchObject({ clientId: "matriz-admin", appId: "matriz-admin" })
  })

  it("does not accept legacy Seumei variables", () => {
    expect(() => oidcConfig({ SEUMEI_OIDC_CLIENT_ID: "seumei", SEUMEI_OIDC_CLIENT_SECRET: "s".repeat(32), SEUMEI_OIDC_CALLBACK_URL: "http://127.0.0.1:3008/api/auth/oidc/callback", SEUMEI_SESSION_SECRET: "t".repeat(32), MATRIZ_IDENTITY_ISSUER: "http://127.0.0.1:8080" })).toThrow(/ADMIN_OIDC_CLIENT_ID/)
  })
})
