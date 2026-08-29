import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { CompanyWorkspaceShell } from "./CompanyWorkspaceShell"

afterEach(cleanup)

describe("CompanyWorkspaceShell", () => {
  it("renders company context and semantic navigation", () => {
    render(
      <CompanyWorkspaceShell shell={{
        companyName: "Oficina Aurora",
        roleLabel: "Proprietário",
        navigation: [
          { label: "Visão geral", href: "/workspace" },
          { label: "Membros", href: "/workspace/members" },
        ],
      }}><h1>Conteúdo</h1></CompanyWorkspaceShell>,
    )
    expect(screen.getByRole("navigation", { name: "Workspace" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Membros" })).toBeInTheDocument()
    expect(screen.getByText("Proprietário")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Conteúdo" })).toBeInTheDocument()
  })

  it("does not invent a members link for a standard role", () => {
    render(
      <CompanyWorkspaceShell shell={{ companyName: "Oficina Aurora", roleLabel: "Membro", navigation: [{ label: "Visão geral", href: "/workspace" }] }}>
        <span>Conteúdo</span>
      </CompanyWorkspaceShell>,
    )
    expect(screen.queryByRole("link", { name: "Membros" })).toBeNull()
  })

  it("opens a searchable command palette without duplicating routes", () => {
    render(
      <CompanyWorkspaceShell shell={{
        companyName: "Oficina Aurora",
        roleLabel: "Proprietário",
        navigation: [
          { label: "Visão geral", href: "/workspace" },
          { label: "Produtos", href: "/workspace/products" },
        ],
      }}><span>Conteúdo</span></CompanyWorkspaceShell>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Buscar no workspace" }))
    const dialog = screen.getByRole("dialog", { name: "Busca global" })
    expect(dialog).toBeInTheDocument()

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar no Seumei" }), {
      target: { value: "produtos" },
    })
    expect(within(dialog).getAllByRole("link", { name: /Produtos/ })).toHaveLength(1)
    expect(within(dialog).queryByRole("link", { name: /Visão geral/ })).toBeNull()
  })

  it("opens the command palette with the platform shortcut", () => {
    render(
      <CompanyWorkspaceShell shell={{
        companyName: "Oficina Aurora",
        roleLabel: "Proprietário",
        navigation: [{ label: "Visão geral", href: "/workspace" }],
      }}><span>Conteúdo</span></CompanyWorkspaceShell>,
    )

    fireEvent.keyDown(window, { key: "k", ctrlKey: true })

    expect(screen.getByRole("dialog", { name: "Busca global" })).toBeInTheDocument()
    expect(screen.getByRole("searchbox", { name: "Buscar no Seumei" })).toHaveFocus()
  })

  it("returns focus to its trigger after Escape", () => {
    render(
      <CompanyWorkspaceShell shell={{
        companyName: "Oficina Aurora",
        roleLabel: "Proprietário",
        navigation: [{ label: "Visão geral", href: "/workspace" }],
      }}><span>Conteúdo</span></CompanyWorkspaceShell>,
    )

    const trigger = screen.getByRole("button", { name: "Buscar no workspace" })
    fireEvent.click(trigger)
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Busca global" }), { key: "Escape" })

    expect(screen.queryByRole("dialog", { name: "Busca global" })).toBeNull()
    expect(trigger).toHaveFocus()
  })
})
