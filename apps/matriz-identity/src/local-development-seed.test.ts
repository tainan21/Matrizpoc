import { describe, expect, it } from "vitest"
import { verifyCredential } from "./credential-authenticator"
import { seedLocalIdentityCredentials } from "./local-development-seed"
import { decryptTotpSecret } from "./mfa"

describe("local Identity credential seed", () => {
  it("upserts password accounts with hashes and never stores plaintext", async () => {
    const rows: unknown[] = []
    const mfaRows: unknown[] = []
    const database = { authAccount: { upsert: async (input: unknown) => { rows.push(input); return input } }, identityMfaMethod: { upsert: async (input: unknown) => { mfaRows.push(input); return input } } }
    const environment = {
      MATRIZ_RUNTIME_PROFILE: "local",
      IDENTITY_LOCAL_OWNER_PASSWORD: "owner-password-local-123",
      IDENTITY_LOCAL_OPERATOR_PASSWORD: "operator-password-local-123",
      IDENTITY_LOCAL_DENIED_PASSWORD: "denied-password-local-123",
      IDENTITY_LOCAL_OWNER_TOTP_SECRET: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      IDENTITY_LOCAL_OPERATOR_TOTP_SECRET: "KRSXG5DSNFXGOIDBNZXXE3DEKRSXG5DS",
      IDENTITY_MFA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64url"),
    }
    await seedLocalIdentityCredentials(database, environment)
    expect(rows).toHaveLength(3)
    const first = rows[0] as { create: { credentialHash: string; email: string }; update: { credentialHash: string } }
    expect(first.create.email).toBe("owner@matriz.local")
    expect(first.create.credentialHash).not.toContain(environment.IDENTITY_LOCAL_OWNER_PASSWORD)
    await expect(verifyCredential(environment.IDENTITY_LOCAL_OWNER_PASSWORD, first.create.credentialHash)).resolves.toBe(true)
    expect(first.update.credentialHash).toBe(first.create.credentialHash)
    expect(mfaRows).toHaveLength(2)
    const ownerMfa = mfaRows[0] as { where: { id: string }; create: { secretCiphertext: string; verifiedAt: Date }; update: { secretCiphertext: string } }
    expect(ownerMfa.where.id).toBe("mfa-local-owner-totp")
    expect(ownerMfa.create.secretCiphertext).not.toContain(environment.IDENTITY_LOCAL_OWNER_TOTP_SECRET)
    expect(decryptTotpSecret(ownerMfa.create.secretCiphertext, environment.IDENTITY_MFA_ENCRYPTION_KEY)).toBe(environment.IDENTITY_LOCAL_OWNER_TOTP_SECRET)
    expect(ownerMfa.create.verifiedAt).toEqual(new Date(0))
  })

  it("fails closed outside local profile and for weak credentials", async () => {
    const database = { authAccount: { upsert: async () => ({}) }, identityMfaMethod: { upsert: async () => ({}) } }
    await expect(seedLocalIdentityCredentials(database, { MATRIZ_RUNTIME_PROFILE: "production" })).rejects.toThrow(/local profile/)
    await expect(seedLocalIdentityCredentials(database, { MATRIZ_RUNTIME_PROFILE: "local", IDENTITY_LOCAL_OWNER_PASSWORD: "weak", IDENTITY_LOCAL_OPERATOR_PASSWORD: "operator-password-local-123", IDENTITY_LOCAL_DENIED_PASSWORD: "denied-password-local-123" })).rejects.toThrow(/OWNER_PASSWORD/)
  })
})
