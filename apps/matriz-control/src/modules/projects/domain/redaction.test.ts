import { describe, expect, it } from "vitest"
import { redactProjectOutput } from "./redaction"

describe("project output redaction", () => {
  it.each([
    ["TOKEN=synthetic-secret", "TOKEN=[redacted]"],
    ["password: hunter2", "password: [redacted]"],
    ["Authorization: Bearer abc.def", "Authorization: [redacted]"],
    ["fetch https://alice:secret@example.test/path", "fetch https://[redacted]@example.test/path"],
    ["api_key = value", "api_key = [redacted]"],
  ])("redacts %s", (input, expected) => expect(redactProjectOutput(input)).toBe(expected))

  it("preserves benign output", () => {
    expect(redactProjectOutput("ready on http://localhost:4100")).toBe("ready on http://localhost:4100")
  })
})
