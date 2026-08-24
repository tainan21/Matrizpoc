import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { SeumeiShell } from "./SeumeiShell"
import type { SeumeiShellProps } from "./shell.types"

const fixtureProps: Omit<SeumeiShellProps, "children"> = {
  user: { name: "Tai Demo", role: "Proprietário" },
  company: {
    name: "Galáxia Burger",
    logoUrl: "/galaxia.svg",
    accent: "#8b5cf6",
  },
  activeApp: { id: "products", name: "Produtos", icon: "package" },
  apps: [
    { id: "dashboard", name: "Dashboard", icon: "dashboard", href: "/dashboard" },
    { id: "products", name: "Produtos", icon: "package", href: "/products" },
  ],
  navigation: [
    { id: "products", label: "Produtos", href: "/products" },
    { id: "categories", label: "Categorias", href: "/products/categories" },
  ],
}

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(cleanup)

describe("SeumeiShell", () => {
  it("reveals contextual navigation without hover", () => {
    render(<SeumeiShell {...fixtureProps}><p>Conteúdo</p></SeumeiShell>)

    fireEvent.click(screen.getByRole("button", { name: /expandir navegação/i }))

    expect(screen.getByRole("navigation", { name: /aplicação atual/i }))
      .toHaveAttribute("data-expanded", "true")
  })

  it("keeps app switching available to keyboard users", () => {
    render(<SeumeiShell {...fixtureProps}><p>Conteúdo</p></SeumeiShell>)
    const trigger = screen.getByRole("button", { name: /aplicativos seumei/i })

    trigger.focus()
    fireEvent.keyDown(trigger, { key: "Enter" })

    expect(screen.getByRole("dialog", { name: /aplicativos seumei/i })).toBeVisible()
  })

  it("closes transient navigation with Escape and restores focus", () => {
    render(<SeumeiShell {...fixtureProps}><p>Conteúdo</p></SeumeiShell>)
    const trigger = screen.getByRole("button", { name: /aplicativos seumei/i })
    fireEvent.click(trigger)
    fireEvent.keyDown(screen.getByRole("dialog", { name: /aplicativos seumei/i }), { key: "Escape" })

    expect(screen.queryByRole("dialog", { name: /aplicativos seumei/i })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
