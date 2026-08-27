import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
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
})
