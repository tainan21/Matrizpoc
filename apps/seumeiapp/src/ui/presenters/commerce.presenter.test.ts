import { describe, expect, it } from "vitest"
import { money, toOrderViewModel } from "./commerce.presenter"
describe("commerce presenter", () => { it("formats money and operational status", () => { expect(money(2990)).toContain("29,90"); expect(toOrderViewModel({ id: "o", tenantId: "t", orderNumber: 7, status: "PLACED", customer: { id: "c", name: "Ana", email: null, phone: null }, subtotalCents: 2990, totalCents: 2990, currency: "BRL", version: 1, createdAt: "2026-08-24T12:00:00.000Z", items: [], timeline: [] })).toMatchObject({ numberLabel: "#0007", statusLabel: "Recebido" }) }) })
