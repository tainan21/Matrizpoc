import { describe, expect, it } from "vitest"
import { presentDesktopSurface } from "./desktop-surface-presenter"

describe("desktop-only operational panels", () => {
  it("is explicit in the web runtime and available in the installed desktop runtime", () => {
    expect(presentDesktopSurface("web", "Agentes")).toMatchObject({ available: false, message: expect.stringContaining("aplicativo desktop") })
    expect(presentDesktopSurface("desktop", "Atualizações")).toEqual({ available: true, message: "Atualizações disponíveis no desktop." })
  })
})
