import { describe, expect, it } from "vitest"
import { appendActivity, createActivityLedger } from "./activity-ledger"

describe("activity ledger", () => {
  it("sanitizes sensitive text and retains the newest 200 entries", () => {
    let ledger = createActivityLedger()
    for (let index = 0; index < 205; index += 1) {
      ledger = appendActivity(ledger, {
        id: `activity-${index}`,
        occurredAt: new Date(1_700_000_000_000 + index).toISOString(),
        category: "git",
        action: "commit",
        subjectId: "matriz-control",
        outcome: "succeeded",
        message: index === 204 ? "token=secret C:\\Apps\\matriz-infra-hub\\.env" : `Commit ${index}`,
      })
    }

    expect(ledger.entries).toHaveLength(200)
    expect(ledger.entries[0].id).toBe("activity-204")
    expect(ledger.entries[0].message).toBe("[conteúdo sensível removido]")
    expect(ledger.entries.at(-1)?.id).toBe("activity-5")
  })
})
