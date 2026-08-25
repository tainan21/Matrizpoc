import { describe, expect, it } from "vitest"
import { assertSameOrigin, parseCreateSession, parseTerminalInput } from "./http"

describe("terminal http validation", () => {
  it("accepts identifiers but never raw commands", () => {
    expect(parseCreateSession({ projectId: "matriz-hub", actionId: "dev" })).toEqual({ projectId: "matriz-hub", actionId: "dev" })
    expect(() => parseCreateSession({ projectId: "matriz-hub", actionId: "dev", command: "rm" })).toThrow("Unexpected field")
  })

  it("bounds terminal input", () => {
    expect(parseTerminalInput({ input: "help\n" })).toBe("help\n")
    expect(() => parseTerminalInput({ input: "x".repeat(4097) })).toThrow("Input too large")
  })

  it("rejects cross-origin mutations", () => {
    expect(() => assertSameOrigin(new Request("http://localhost:3008/api", { headers: { origin: "http://evil.test" } }))).toThrow("Forbidden origin")
  })
})
