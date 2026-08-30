import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import type { InfrastructureContractV1 } from "../../packages/integration/infrastructure-contracts/src/index"
import { buildLocalOidcClientRegistrations, oidcClientSecretEnvironmentKey } from "./local-oidc-clients"

const contract: InfrastructureContractV1 = {
  schemaVersion: "v1", appId: "matriz-ops", classification: "platform",
  runtime: { kind: "web", port: 3011, healthPath: "/api/health" },
  database: { required: true, schema: "ops", tenancy: "operator-global", runtimeRole: "matriz_ops_runtime", migrationRole: "matriz_ops_migration", prismaSchema: "prisma/ops/schema.prisma" },
  identity: { required: true, oidcClientId: "matriz-ops", callbackPath: "/api/auth/oidc/callback" },
  cache: { required: false, namespaces: [] }, events: { transport: "none", outbox: false, inbox: false },
  environment: { keys: [] }, filesystem: { required: false },
}

describe("local OIDC client registrations", () => {
  it("derives an exact loopback callback and stores only the secret fingerprint", () => {
    const secret = "ops-secret-0123456789-abcdefghijkl"
    expect(buildLocalOidcClientRegistrations([contract], { OIDC_CLIENT_SECRET_MATRIZ_OPS: secret })).toEqual([{
      appId: "matriz-ops", clientId: "matriz-ops", name: "matriz-ops local development",
      redirectUris: ["http://127.0.0.1:3011/api/auth/oidc/callback"],
      postLogoutRedirectUris: ["http://127.0.0.1:3011/"],
      grantTypes: ["authorization_code", "refresh_token"], responseTypes: ["code"], tokenEndpointAuthMethod: "client_secret_basic",
      secretFingerprint: createHash("sha256").update(secret).digest("hex"), enabled: true,
    }])
  })

  it("fails closed for missing or weak secrets and normalizes client ids exactly like Identity", () => {
    expect(oidcClientSecretEnvironmentKey("matriz-ops")).toBe("OIDC_CLIENT_SECRET_MATRIZ_OPS")
    expect(() => buildLocalOidcClientRegistrations([contract], {})).toThrow(/OIDC_CLIENT_SECRET_MATRIZ_OPS/)
    expect(() => buildLocalOidcClientRegistrations([contract], { OIDC_CLIENT_SECRET_MATRIZ_OPS: "weak" })).toThrow(/32 bytes/)
  })
})
