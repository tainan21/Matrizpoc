import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"

import { assertExactRedirectUri, loadActiveClients } from "./persistence"

describe("OIDC client catalog", () => {
  it("accepts only https or loopback http exact redirects without credentials", () => {
    expect(assertExactRedirectUri("https://spot.example/callback")).toBe("https://spot.example/callback")
    expect(assertExactRedirectUri("http://127.0.0.1:3001/callback")).toContain("127.0.0.1")
    for (const uri of ["ftp://spot.example/callback", "custom:callback", "https://user:pass@spot.example/callback", "https://spot.example/callback#fragment", "https://spot.example/*"]) {
      expect(() => assertExactRedirectUri(uri)).toThrow()
    }
  })

  it("loads public PKCE clients without secrets and confidential clients only from matching env fingerprints", async () => {
    const secret = "strong-client-secret-with-32-bytes-minimum"
    const common = { id: "id", name: "Client", redirectUris: ["https://app.example/callback"], postLogoutRedirectUris: [], grantTypes: ["authorization_code", "refresh_token"], responseTypes: ["code"], enabled: true, revokedAt: null, revokedByUserId: null, revocationReason: null, createdAt: new Date(), updatedAt: new Date() }
    const database = { oidcClient: { findMany: async () => [
      { ...common, clientId: "public-app", tokenEndpointAuthMethod: "none", secretFingerprint: null },
      { ...common, clientId: "private-app", tokenEndpointAuthMethod: "client_secret_basic", secretFingerprint: createHash("sha256").update(secret).digest("hex") },
    ] } }
    const clients = await loadActiveClients(database as never, { OIDC_CLIENT_SECRET_PRIVATE_APP: secret })
    expect(clients[0]).not.toHaveProperty("client_secret")
    expect(clients[1]).toMatchObject({ client_id: "private-app", client_secret: secret })
    await expect(loadActiveClients(database as never, {})).rejects.toThrow(/Missing or weak secret material/)
  })
})
