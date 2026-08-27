import { describe, expect, it } from "vitest"
import { createCredentialAuthenticator, hashCredential, verifyCredential } from "./credential-authenticator"

describe("Core credential authenticator", () => {
  it("uses versioned memory-hard hashes and rejects wrong credentials", async () => {
    const hash = await hashCredential("correct horse battery staple", Buffer.alloc(16, 7))
    expect(hash).toMatch(/^scrypt-v1\$32768\$8\$1\$/)
    expect(await verifyCredential("correct horse battery staple", hash)).toBe(true)
    expect(await verifyCredential("wrong credential", hash)).toBe(false)
  })
  it("requires verified Core accounts with a credential hash", async () => {
    const hash = await hashCredential("correct horse battery staple", Buffer.alloc(16, 8))
    const database = { authAccount: { findFirst: async () => ({ userId: "u1", credentialHash: hash }) } }
    await expect(createCredentialAuthenticator(database as never).authenticate({ login: "User@Example.test", credential: "correct horse battery staple" })).resolves.toEqual({ accountId: "u1" })
  })
})
