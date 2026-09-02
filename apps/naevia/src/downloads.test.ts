import { describe, expect, it } from "vitest"
import { safeDownloadName, validDownloadUrl } from "./downloads"

describe("download safety", () => {
  it("keeps a bounded leaf name and removes traversal characters", () => {
    expect(safeDownloadName("../../relatório?.pdf")).toBe("relatório_.pdf")
    expect(safeDownloadName("CON")).toBe("download.bin")
  })

  it("allows only HTTP(S) sources", () => {
    expect(validDownloadUrl("https://example.test/file.zip")).toBe(true)
    expect(validDownloadUrl("file:///C:/secret.txt")).toBe(false)
    expect(validDownloadUrl("javascript:alert(1)")).toBe(false)
  })
})
