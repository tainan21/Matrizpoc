import { describe, expect, it } from "vitest"
import { classifyLocalInstallers } from "./local-installer-policy"

describe("local installer policy", () => {
  it("recognizes allowlisted products and marks only the greatest semver as latest", () => {
    const result = classifyLocalInstallers([
      { fileName: "matriz-control-1.0.0-windows-x64-setup.exe", sizeBytes: 10, sha256: "a".repeat(64), signed: true },
      { fileName: "matriz-control-1.1.0-windows-x64-setup.exe", sizeBytes: 11, sha256: "b".repeat(64), signed: true },
      { fileName: "unknown-9.0.0-windows-x64-setup.exe", sizeBytes: 12, sha256: "c".repeat(64), signed: false },
    ])

    expect(result.map(({ productId, version, trust, isLatestForProduct }) => ({ productId, version, trust, isLatestForProduct }))).toEqual([
      { productId: "matriz-control-tauri", version: "1.1.0", trust: "signed-matriz", isLatestForProduct: true },
      { productId: "matriz-control-tauri", version: "1.0.0", trust: "signed-matriz", isLatestForProduct: false },
      { productId: "unknown", version: "0.0.0", trust: "blocked", isLatestForProduct: false },
    ])
  })

  it("keeps an allowlisted unsigned build explicit", () => {
    const [installer] = classifyLocalInstallers([
      { fileName: "matriz-ops-0.1.0-windows-x64-setup.exe", sizeBytes: 10, sha256: "d".repeat(64), signed: false },
    ])
    expect(installer?.trust).toBe("unsigned-development")
    expect(installer?.message).toContain("desenvolvimento")
  })
})
