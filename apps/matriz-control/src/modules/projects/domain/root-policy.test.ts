import { describe, expect, it } from "vitest"
import { assertAllowedCanonicalRoot, canonicalRootKey } from "./root-policy"

describe("external project root policy", () => {
  const context = { homeDirectory: "C:\\Users\\Taina", windowsDirectory: "C:\\Windows", programFilesDirectories: ["C:\\Program Files", "C:\\Program Files (x86)"] }

  it.each([
    "C:\\", "C:\\Users\\Taina", "C:\\Windows", "C:\\Windows\\System32",
    "C:\\Program Files", "C:\\Program Files\\Demo", "C:\\Users\\Taina\\.ssh",
    "C:\\Users\\Taina\\AppData\\Roaming\\Microsoft\\Credentials",
  ])("rejects broad or sensitive root %s", (path) => {
    expect(() => assertAllowedCanonicalRoot(path, context)).toThrow("Project root is too broad or sensitive")
  })

  it("allows an ordinary project directory", () => {
    expect(assertAllowedCanonicalRoot("C:\\Projects\\demo", context)).toBe("C:\\Projects\\demo")
  })

  it("deduplicates canonical Windows paths case-insensitively", () => {
    expect(canonicalRootKey("C:\\Projects\\Demo\\")).toBe(canonicalRootKey("c:\\projects\\demo"))
  })
})
