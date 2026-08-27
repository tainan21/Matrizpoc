import { describe, expect, it } from "vitest"
import { embedTrustedOrigins } from "./prepare-desktop-shell"

describe("embedTrustedOrigins", () => {
  it("embeds validated HTTPS Seumei and MyHub URLs into compiled build config", () => {
    expect(embedTrustedOrigins('exports.app="__SEUMEI_DESKTOP_APP_URL__";exports.hub="__SEUMEI_DESKTOP_HUB_URL__"', { SEUMEI_DESKTOP_APP_URL: "https://seumei.example/workspace", SEUMEI_DESKTOP_HUB_URL: "https://myhub.example/login" })).toBe('exports.app="https://seumei.example/workspace";exports.hub="https://myhub.example/login"')
  })

  it("rejects missing and non-HTTPS production origins", () => {
    expect(() => embedTrustedOrigins("", {})).toThrow("SEUMEI_DESKTOP_APP_URL is required at build time")
    expect(() => embedTrustedOrigins("", { SEUMEI_DESKTOP_APP_URL: "http://seumei.example", SEUMEI_DESKTOP_HUB_URL: "https://myhub.example" })).toThrow("SEUMEI_DESKTOP_APP_URL must be HTTPS")
  })
})
