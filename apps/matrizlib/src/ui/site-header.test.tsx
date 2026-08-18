import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SiteHeader } from "./site-header"

afterEach(cleanup)
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false })
})

describe("SiteHeader mobile navigation", () => {
  it("presents components, themes and sounds as equal primary destinations", () => {
    render(<SiteHeader />)

    const primary = screen.getByRole("navigation", { name: "Navegação principal" })
    expect(within(primary).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Componentes",
      "Temas",
      "Sons",
    ])
    expect(within(primary).getByRole("link", { name: "Sons" })).toHaveAttribute("href", "/sounds")
    expect(
      within(screen.getByRole("navigation", { name: "Navegação técnica" })).getByRole("link", {
        name: "Arquitetura",
      }),
    ).toBeVisible()
  })

  it("does not hide the primary navigation at the mobile breakpoint", () => {
    const stylesheet = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8")
    const mobileRules = stylesheet.slice(stylesheet.indexOf("@media (max-width: 44rem)"))

    expect(mobileRules).not.toMatch(/\.site-header__nav\s*\{\s*display:\s*none;/)
    expect(mobileRules).not.toMatch(/\.site-header__technical\s*\{\s*display:\s*none;/)
  })
})
