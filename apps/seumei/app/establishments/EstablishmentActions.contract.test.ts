import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const source = readFileSync(
  fileURLToPath(new URL("./EstablishmentActions.tsx", import.meta.url)),
  "utf8",
)

describe("EstablishmentActions accessibility contract", () => {
  it("keeps the shared button connected to explicit live request feedback", () => {
    expect(source).toContain('aria-describedby={message ? "contract-request-status" : undefined}')
    expect(source).toContain('id="contract-request-status"')
    expect(source).toContain('aria-hidden="true"')
    expect(source).toContain('<Alert')
  })
})
