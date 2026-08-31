import { describe, expect, it } from "vitest"
import { verifyDesktopReleaseMatrix } from "../../tooling/scripts/verify-desktop-releases"

describe("desktop release matrix", () => {
  it("keeps versions, Windows identities and release workflows coherent", () => {
    expect(verifyDesktopReleaseMatrix(process.cwd())).toEqual([])
  })
})
