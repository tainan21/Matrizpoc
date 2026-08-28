import { describe, expect, it, vi } from "vitest"
import { runSensitiveOperation } from "./sensitive-operation"

const now = new Date("2026-08-25T12:00:00.000Z")

describe("runSensitiveOperation", () => {
  it("persiste auditoria sanitizada com before/after depois da mutação", async () => {
    const mutate = vi.fn(async () => ({ before: { email: "before@matriz.test", status: "ACTIVE" }, after: { email: "after@matriz.test", status: "SUSPENDED" }, result: "ok" }))
    const writeAudit = vi.fn(async () => undefined)
    const result = await runSensitiveOperation({
      actor: { userId: "owner-1", role: "OWNER", sessionAuthenticatedAt: new Date("2026-08-25T11:50:00.000Z"), otpVerifiedAt: new Date("2026-08-25T11:58:00.000Z") },
      request: { action: "users.manage", targetType: "user", targetId: "user-2", reason: "Risco confirmado pelo suporte", confirmation: "CONFIRMAR", correlationId: "corr-12345678" },
      mutate,
      writeAudit,
      now,
    })
    expect(result).toBe("ok")
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ beforeJson: { email: "[REDACTED]", status: "ACTIVE" }, afterJson: { email: "[REDACTED]", status: "SUSPENDED" } }))
  })

  it("não executa a mutação sem OTP recente", async () => {
    const mutate = vi.fn()
    await expect(runSensitiveOperation({
      actor: { userId: "owner-1", role: "OWNER", sessionAuthenticatedAt: now, otpVerifiedAt: undefined },
      request: { action: "wallet.adjust", targetType: "wallet", targetId: "wallet-1", reason: "Crédito promocional aprovado", confirmation: "CONFIRMAR", correlationId: "corr-12345678" },
      mutate,
      writeAudit: vi.fn(),
      now,
    })).rejects.toThrow("recent OTP")
    expect(mutate).not.toHaveBeenCalled()
  })

  it("não registra sucesso quando a mutação falha", async () => {
    const writeAudit = vi.fn()
    await expect(runSensitiveOperation({
      actor: { userId: "owner-1", role: "OWNER", sessionAuthenticatedAt: now, otpVerifiedAt: now },
      request: { action: "users.manage", targetType: "user", targetId: "user-2", reason: "Solicitação operacional válida", confirmation: "CONFIRMAR", correlationId: "corr-12345678" },
      mutate: async () => { throw new Error("DB_DOWN") },
      writeAudit,
      now,
    })).rejects.toThrow("DB_DOWN")
    expect(writeAudit).not.toHaveBeenCalled()
  })

  it("repete o resultado auditado sem executar novamente a mutação", async () => {
    const mutate = vi.fn()
    const writeAudit = vi.fn()
    const result = await runSensitiveOperation({
      actor: { userId: "owner-1", role: "OWNER", sessionAuthenticatedAt: now, otpVerifiedAt: now },
      request: { action: "wallet.adjust", targetType: "wallet", targetId: "wallet-1", reason: "Crédito operacional autorizado", confirmation: "CONFIRMAR", correlationId: "corr-replay", idempotencyKey: "idem-replay" },
      readIdempotentResult: async () => ({ found: true, result: { transactionId: "tx-existing" } }),
      mutate,
      writeAudit,
      now,
    })
    expect(result).toEqual({ transactionId: "tx-existing" })
    expect(mutate).not.toHaveBeenCalled()
    expect(writeAudit).not.toHaveBeenCalled()
  })
})
