import { describe, expect, it } from "vitest"
import {
  canAutoHideTopbar,
  createRailPreferenceCookie,
  createTopbarPreferenceCookie,
  normalizeRailPreference,
  normalizeTopbarPreference,
  selectActiveShellHref,
} from "./shell-preferences"

describe("shell preferences", () => {
  it("preserves the two supported rail preferences", () => {
    expect(normalizeRailPreference("expanded")).toBe("expanded")
    expect(normalizeRailPreference("collapsed")).toBe("collapsed")
  })

  it("falls back to a collapsed rail for missing or malformed values", () => {
    expect(normalizeRailPreference(undefined)).toBe("collapsed")
    expect(normalizeRailPreference("open")).toBe("collapsed")
  })

  it("preserves the two supported topbar preferences", () => {
    expect(normalizeTopbarPreference("auto")).toBe("auto")
    expect(normalizeTopbarPreference("pinned")).toBe("pinned")
  })

  it("falls back to an automatic topbar for missing or malformed values", () => {
    expect(normalizeTopbarPreference(undefined)).toBe("auto")
    expect(normalizeTopbarPreference("hidden")).toBe("auto")
  })

  it("serializes rail preferences as a durable same-site cookie", () => {
    expect(createRailPreferenceCookie("expanded")).toBe(
      "matriz-workbench-rail=expanded; Path=/; Max-Age=31536000; SameSite=Strict",
    )
  })

  it("serializes topbar preferences as a durable same-site cookie", () => {
    expect(createTopbarPreferenceCookie("pinned")).toBe(
      "matriz-workbench-topbar=pinned; Path=/; Max-Age=31536000; SameSite=Strict",
    )
  })

  it("selects the most specific destination for a nested route", () => {
    expect(
      selectActiveShellHref("/projects/spot/backlog", [
        "/",
        "/projects",
        "/projects/spot",
        "/sites",
      ]),
    ).toBe("/projects/spot")
    expect(selectActiveShellHref("/unknown", ["/", "/projects"])).toBeUndefined()
  })

  it("allows auto-hide only with hover, a fine pointer and ordinary motion", () => {
    expect(canAutoHideTopbar({ hover: true, finePointer: true, reducedMotion: false, smallViewport: false })).toBe(true)
    expect(canAutoHideTopbar({ hover: false, finePointer: true, reducedMotion: false, smallViewport: false })).toBe(false)
    expect(canAutoHideTopbar({ hover: true, finePointer: false, reducedMotion: false, smallViewport: false })).toBe(false)
    expect(canAutoHideTopbar({ hover: true, finePointer: true, reducedMotion: true, smallViewport: false })).toBe(false)
    expect(canAutoHideTopbar({ hover: true, finePointer: true, reducedMotion: false, smallViewport: true })).toBe(false)
  })
})
