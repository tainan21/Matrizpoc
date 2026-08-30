import { describe, expect, it } from "vitest"
import { verifyCredential } from "./credential-authenticator"
import { seedLocalIdentityCredentials } from "./local-development-seed"

describe("local Identity credential seed", () => {
  it("upserts password accounts with hashes and never stores plaintext", async () => {
    const rows: unknown[] = []
    const database = { authAccount: { upsert: async (input: unknown) => { rows.push(input); return input } } }
    const environment = { MATRIZ_RUNTIME_PROFILE: "local", IDENTITY_LOCAL_OWNER_PASSWORD: "owner-password-local-123", IDENTITY_LOCAL_OPERATOR_PASSWORD: "operator-password-local-123", IDENTITY_LOCAL_DENIED_PASSWORD: "denied-password-local-123" }
    await seedLocalIdentityCredentials(database, environment)
    expect(rows).toHaveLength(3)
    const first = rows[0] as { create: { credentialHash: string; email: string }; update: { credentialHash: string } }
    expect(first.create.email).toBe("owner@matriz.local")
    expect(first.create.credentialHash).not.toContain(environment.IDENTITY_LOCAL_OWNER_PASSWORD)
    await expect(verifyCredential(environment.IDENTITY_LOCAL_OWNER_PASSWORD, first.create.credentialHash)).resolves.toBe(true)
    expect(first.update.credentialHash).toBe(first.create.credentialHash)
  })

  it("fails closed outside local profile and for weak credentials", async () => {
    const database = { authAccount: { upsert: async () => ({}) } }
    await expect(seedLocalIdentityCredentials(database, { MATRIZ_RUNTIME_PROFILE: "production" })).rejects.toThrow(/local profile/)
    await expect(seedLocalIdentityCredentials(database, { MATRIZ_RUNTIME_PROFILE: "local", IDENTITY_LOCAL_OWNER_PASSWORD: "weak", IDENTITY_LOCAL_OPERATOR_PASSWORD: "operator-password-local-123", IDENTITY_LOCAL_DENIED_PASSWORD: "denied-password-local-123" })).rejects.toThrow(/OWNER_PASSWORD/)
  })
})
