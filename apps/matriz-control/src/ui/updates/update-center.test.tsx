import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { DesktopUpdateSnapshot } from "../../domain/desktop-bridge"
import { presentDesktopUpdate, UpdateCenterView } from "./update-center"

const base: DesktopUpdateSnapshot = { state: "idle", currentVersion: "0.1.0", availableVersion: null, progress: null, notes: null, message: "Pronto" }

describe("desktop update center", () => {
  it.each([
    ["idle", "check"], ["error", "check"], ["available", "download"], ["downloaded", "install"], ["checking", null], ["downloading", null], ["current", "check"], ["unavailable", null],
  ] as const)("offers only the valid action for %s", (state, action) => {
    expect(presentDesktopUpdate({ ...base, state })).toMatchObject({ action })
  })

  it("renders version, notes, progress and a compact dialog", () => {
    const markup = renderToStaticMarkup(<UpdateCenterView snapshot={{ ...base, state: "downloading", availableVersion: "0.2.0", progress: 42, notes: "Mais leve" }} busy={false} onAction={() => undefined} onClose={() => undefined} />)
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain("0.2.0")
    expect(markup).toContain("42%")
    expect(markup).toContain("Mais leve")
  })
})
