import { describe, expect, it } from "vitest"
import { presentReconciliation } from "./operational-pulse"

describe("presentReconciliation", () => {
  it("shows the never-run financial gate as attention", () => {
    expect(presentReconciliation({ status: "NOT_RUN", checkedAt: null, openDiscrepancies: 0, outgoingTransfersBlocked: true })).toEqual({
      id: "reconciliation", label: "Reconciliação", status: "warning", detail: "nunca executada · saídas BRL bloqueadas",
    })
  })

  it("shows healthy reconciliation as normal and divergence as critical", () => {
    expect(presentReconciliation({ status: "HEALTHY", checkedAt: "2026-08-25T12:00:00.000Z", openDiscrepancies: 0, outgoingTransfersBlocked: false }).status).toBe("normal")
    expect(presentReconciliation({ status: "DIVERGENT", checkedAt: "2026-08-25T12:00:00.000Z", openDiscrepancies: 1, outgoingTransfersBlocked: true }).status).toBe("critical")
  })
})
