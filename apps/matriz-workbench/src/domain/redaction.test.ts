import { describe, expect, it } from "vitest"
import { redactOperationalText, redactSensitiveText } from "./redaction"

describe("operational redaction", () => {
  it("removes local identity and common credential shapes", () => {
    expect(redactSensitiveText(
      "C:\\Users\\alice\\.codex token=abc Bearer xyz /home/bob/repo",
    )).toBe("%USERPROFILE%\\.codex token=[redacted] Bearer [redacted] $HOME/repo")
  })

  it("applies explicit file and URL disclosure policy", () => {
    const redacted = redactOperationalText(
      "Veja apps/sample/src/a.ts em https://preview.example/a e C:\\repo\\a.ts",
      { includeFilePaths: false, includeExternalUrls: false },
    )
    expect(redacted).not.toContain("apps/sample")
    expect(redacted).not.toContain("https://")
    expect(redacted).not.toContain("C:\\repo")
    expect(redacted).toContain("[url omitted]")
    expect(redacted).toContain("[path omitted]")
  })
})
