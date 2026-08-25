import { describe, expect, it } from "vitest"
import { computeOrderTotal, normalizeCheckoutCustomer, requireOrderTransition } from "./commerce"

describe("commerce rules", () => {
  it("normalizes tenant-local customer identity", () => {
    expect(normalizeCheckoutCustomer({ name: "  Ana   Lima ", email: " ANA@EXAMPLE.COM ", phone: "(11) 99999-0000" })).toEqual({ name: "Ana Lima", email: "ana@example.com", phone: "5511999990000" })
  })
  it("rejects invalid identity and unsafe quantities", () => {
    expect(() => normalizeCheckoutCustomer({ name: "A", email: "bad", phone: "" })).toThrow()
    expect(() => computeOrderTotal(2990, 0)).toThrow()
    expect(() => computeOrderTotal(Number.MAX_SAFE_INTEGER, 2)).toThrow()
  })
  it("calculates server totals", () => expect(computeOrderTotal(2990, 2)).toBe(5980))
  it.each([["PLACED", "CONFIRMED"], ["CONFIRMED", "PREPARING"], ["PREPARING", "READY"], ["READY", "COMPLETED"], ["PLACED", "CANCELLED"]] as const)("allows %s -> %s", (from, to) => expect(requireOrderTransition(from, to)).toBe(to))
  it.each([["PLACED", "READY"], ["COMPLETED", "CANCELLED"], ["CANCELLED", "PLACED"]] as const)("rejects %s -> %s", (from, to) => expect(() => requireOrderTransition(from, to)).toThrow())
})
