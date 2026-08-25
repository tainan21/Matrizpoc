import { describe, expect, it } from "vitest"
import { safeReturnPath } from "./safe-return-path"

describe("safeReturnPath", () => {
  it.each([
    ["/invite/abc_123", "/invite/abc_123"],
    ["/workspace/members", "/workspace/members"],
    [undefined, "/"],
    ["https://evil.example/invite/abc", "/"],
    ["//evil.example/invite/abc", "/"],
    ["/\\evil.example", "/"],
    ["/invite/ok\nset-cookie:x", "/"],
  ] as const)("maps %s to %s", (candidate, expected) => {
    expect(safeReturnPath(candidate)).toBe(expected)
  })
})
