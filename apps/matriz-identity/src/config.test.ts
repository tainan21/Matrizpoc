import { describe, expect, it } from "vitest"

import { buildProviderConfiguration, loadIdentityEnvironment } from "./config"

const signingKey = JSON.stringify({
  kty: "RSA",
  kid: "test-key",
  use: "sig",
  alg: "RS256",
  n: "test-modulus",
  e: "AQAB",
  d: "test-private",
  p: "test-p",
  q: "test-q",
  dp: "test-dp",
  dq: "test-dq",
  qi: "test-qi",
})

describe("identity configuration", () => {
  it("fails closed when issuer, database or signing keys are missing", () => {
    expect(() => loadIdentityEnvironment({ NODE_ENV: "production" })).toThrow(
      /IDENTITY_ISSUER/,
    )
  })

  it("requires https and an asymmetric private signing key in production", () => {
    expect(() =>
      loadIdentityEnvironment({
        NODE_ENV: "production",
        IDENTITY_ISSUER: "http://identity.example.test",
        CORE_RUNTIME_DATABASE_URL: "postgresql://runtime@example.test/matriz",
        IDENTITY_SIGNING_JWKS: signingKey,
        IDENTITY_CSRF_SECRET: "x".repeat(32),
        IDENTITY_COOKIE_KEYS: `${"a".repeat(32)},${"b".repeat(32)}`,
      }),
    ).toThrow(/https/)
  })

  it("enforces code flow, S256 PKCE, short tokens and refresh rotation", () => {
    const configuration = buildProviderConfiguration({
      issuer: "https://identity.example.test",
      databaseUrl: "postgresql://runtime@example.test/matriz",
      jwks: { keys: [JSON.parse(signingKey)] },
      trustProxy: true,
      trustedProxyHops: 1,
      port: 8080,
      csrfSecret: "x".repeat(32),
      cookieKeys: ["a".repeat(32), "b".repeat(32)],
      mfaEncryptionKey: Buffer.alloc(32, 1).toString("base64url"),
    })

    expect(configuration.pkce).toEqual({ methods: ["S256"], required: expect.any(Function) })
    expect(configuration.features?.revocation).toEqual({ enabled: true })
    expect(configuration.ttl?.AccessToken).toBeLessThanOrEqual(600)
    expect(configuration.ttl?.IdToken).toBeLessThanOrEqual(600)
    expect(configuration.rotateRefreshToken).toBe(true)
  })
})
