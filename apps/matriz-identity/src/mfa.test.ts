import { describe, expect, it } from "vitest"
import { consumeRecoveryCode, createTotpEnrollment, decryptTotpSecret, encryptTotpSecret, hashRecoveryCode, requiresStepUp, verifyAndConsumeTotp, verifyRecoveryCode, verifyTotp } from "./mfa"

describe("MFA recovery", () => {
  it("stores one-time recovery material as a hash and consumes it once with audit", async () => {
    const encoded = await hashRecoveryCode("alpha-bravo-charlie")
    expect(encoded).not.toContain("alpha-bravo-charlie")
    expect(await verifyRecoveryCode("alpha-bravo-charlie", encoded)).toBe(true)
    let consumed = false; let audited = false
    const result = await consumeRecoveryCode({ findActive: async () => consumed ? [] : [{ id: "code-1", codeHash: encoded }], consume: async () => { consumed = true; return true }, audit: async () => { audited = true } }, { userId: "user-1", code: "alpha-bravo-charlie" })
    expect(result).toBe(true); expect(consumed).toBe(true); expect(audited).toBe(true)
    expect(await consumeRecoveryCode({ findActive: async () => [], consume: async () => false, audit: async () => undefined }, { userId: "user-1", code: "alpha-bravo-charlie" })).toBe(false)
  })

  it("does not audit when a concurrent request already consumed the code", async () => {
    const encoded = await hashRecoveryCode("delta-echo-foxtrot")
    let audited = false
    expect(await consumeRecoveryCode({ findActive: async () => [{ id: "code-2", codeHash: encoded }], consume: async () => false, audit: async () => { audited = true } }, { userId: "user-1", code: "delta-echo-foxtrot" })).toBe(false)
    expect(audited).toBe(false)
  })
})

describe("TOTP and step-up", () => {
  it("encrypts TOTP secrets with authenticated encryption", () => {
    const key = Buffer.alloc(32, 7).toString("base64url")
    const ciphertext = encryptTotpSecret("JBSWY3DPEHPK3PXP", key)
    expect(ciphertext).not.toContain("JBSWY3DPEHPK3PXP")
    expect(decryptTotpSecret(ciphertext, key)).toBe("JBSWY3DPEHPK3PXP")
    const parts = ciphertext.split("$")
    parts[2] = `${parts[2]!.startsWith("A") ? "B" : "A"}${parts[2]!.slice(1)}`
    expect(() => decryptTotpSecret(parts.join("$"), key)).toThrow()
  })
  it("enrolls a TOTP secret and verifies only the current bounded time window", () => {
    const enrollment = createTotpEnrollment("user@example.com", "JBSWY3DPEHPK3PXP")
    expect(enrollment.method).toMatchObject({ kind: "totp", algorithm: "SHA1", digits: 6, periodSeconds: 30 })
    expect(enrollment.otpauthUri).toContain("otpauth://totp/")
    expect(verifyTotp("287082", "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", new Date(59_000), 0)).toBe(true)
    expect(verifyTotp("287082", "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", new Date(89_000), 0)).toBe(false)
  })

  it("requires step-up when MFA is required but amr or freshness is insufficient", () => {
    expect(requiresStepUp({ required: true, amr: ["pwd"], authTime: 100 }, 120)).toBe(true)
    expect(requiresStepUp({ required: true, amr: ["pwd", "otp"], authTime: 100, acr: "urn:matriz:loa:2" }, 120)).toBe(false)
    expect(requiresStepUp({ required: true, amr: ["pwd", "otp"], authTime: 1, acr: "urn:matriz:loa:2" }, 1_000)).toBe(true)
  })

  it("atomically rejects replay of an already used TOTP counter", async () => {
    let lastCounter = 0
    const repository = { advanceCounter: async (_id: string, counter: number) => { if (counter <= lastCounter) return false; lastCounter = counter; return true } }
    expect(await verifyAndConsumeTotp(repository, { methodId: "mfa-1", secret: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", code: "287082", now: new Date(59_000) })).toBe(true)
    expect(await verifyAndConsumeTotp(repository, { methodId: "mfa-1", secret: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", code: "287082", now: new Date(59_000) })).toBe(false)
  })
})
