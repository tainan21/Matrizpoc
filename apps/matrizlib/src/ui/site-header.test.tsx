import "@testing-library/jest-dom/vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("SiteHeader mobile navigation", () => {
  it("does not hide the primary navigation at the mobile breakpoint", () => {
    const stylesheet = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8")
    const mobileRules = stylesheet.slice(stylesheet.indexOf("@media (max-width: 44rem)"))

    expect(mobileRules).not.toMatch(/\.site-header__nav\s*\{\s*display:\s*none;/)
  })
})
