import { describe, expect, it } from "vitest"
import { oidcConfig } from "./oidc-config"

const environment = {
  MATRIZ_IDENTITY_ISSUER: "https://identity.matriz.example",
  OPS_OIDC_CLIENT_ID: "matriz-ops",
  OPS_OIDC_CLIENT_SECRET: "c".repeat(32),
  OPS_OIDC_CALLBACK_URL: "https://ops.matriz.example/api/auth/oidc/callback",
  OPS_SESSION_SECRET: "s".repeat(32),
}

describe("Ops OIDC configuration", () => {
  it("binds the confidential client to matriz-ops", () => {
    expect(oidcConfig(environment)).toEqual({
      issuer: environment.MATRIZ_IDENTITY_ISSUER,
      clientId: "matriz-ops",
      clientSecret: environment.OPS_OIDC_CLIENT_SECRET,
      appId: "matriz-ops",
      callbackUrl: environment.OPS_OIDC_CALLBACK_URL,
      sessionSecret: environment.OPS_SESSION_SECRET,
    })
  })

  it("fails closed when any required value is absent", () => {
    for (const key of Object.keys(environment)) {
      expect(() => oidcConfig({ ...environment, [key]: "" })).toThrow(`Missing ${key}`)
    }
  })
})
