import { describe, expect, it } from "vitest"
import {
  OpsAuthorizationError,
  authorizeOpsAction,
  canAnonymizeUser,
  sanitizeAuditSnapshot,
} from "./operator-policy"

const recent = new Date("2026-08-25T12:00:00.000Z")
const now = new Date("2026-08-25T12:04:00.000Z")

describe("Ops operator policy", () => {
  it.each([
    ["OWNER", "users.manage"],
    ["OWNER", "wallet.adjust"],
    ["OPERATOR", "users.manage"],
    ["AUDITOR", "audit.read"],
  ] as const)("allows %s to perform %s", (role, action) => {
    expect(authorizeOpsAction({ role, action, reason: "Solicitação operacional válida", confirmation: "CONFIRMAR", sessionAuthenticatedAt: recent, otpVerifiedAt: recent }, now)).toBeTruthy()
  })

  it.each([
    ["AUDITOR", "users.manage"],
    ["OPERATOR", "wallet.adjust"],
  ] as const)("denies %s from %s", (role, action) => {
    expect(() => authorizeOpsAction({ role, action, reason: "Solicitação operacional válida", confirmation: "CONFIRMAR", sessionAuthenticatedAt: recent, otpVerifiedAt: recent }, now)).toThrow(OpsAuthorizationError)
  })

  it("requires reason, typed confirmation, recent session and recent OTP", () => {
    const base = { role: "OWNER" as const, action: "wallet.adjust" as const, reason: "Solicitação operacional válida", confirmation: "CONFIRMAR", sessionAuthenticatedAt: recent, otpVerifiedAt: recent }
    expect(() => authorizeOpsAction({ ...base, reason: "curto" }, now)).toThrow("reason")
    expect(() => authorizeOpsAction({ ...base, confirmation: "sim" }, now)).toThrow("confirmation")
    expect(() => authorizeOpsAction({ ...base, sessionAuthenticatedAt: new Date("2026-08-25T11:40:00Z") }, now)).toThrow("session")
    expect(() => authorizeOpsAction({ ...base, otpVerifiedAt: new Date("2026-08-25T11:50:00Z") }, now)).toThrow("OTP")
  })

  it("blocks anonymization while financial or audit obligations remain", () => {
    expect(canAnonymizeUser({ brlBalanceMinor: 1n, pendingFinancialOperations: 0, openDisputes: 0, auditHold: false })).toEqual({ allowed: false, blockers: ["BRL_BALANCE"] })
    expect(canAnonymizeUser({ brlBalanceMinor: 0n, pendingFinancialOperations: 0, openDisputes: 0, auditHold: false })).toEqual({ allowed: true, blockers: [] })
  })

  it("removes secrets and direct PII from audit snapshots", () => {
    expect(sanitizeAuditSnapshot({ id: "user_1", email: "owner@example.com", displayName: "Owner", token: "secret", status: "ACTIVE", nested: { cookie: "secret", appId: "spot" } })).toEqual({
      id: "user_1",
      email: "[REDACTED]",
      displayName: "[REDACTED]",
      token: "[REDACTED]",
      status: "ACTIVE",
      nested: { cookie: "[REDACTED]", appId: "spot" },
    })
  })
})
