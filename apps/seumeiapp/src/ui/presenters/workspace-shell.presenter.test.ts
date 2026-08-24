import { describe, expect, it } from "vitest"
import { toWorkspaceShellViewModel } from "./workspace-shell.presenter"

const company = {
  id: "company_a",
  tenantId: "tenant_secret",
  name: "Oficina Aurora",
  slug: "oficina-aurora",
  createdByUserId: "owner",
  status: "ACTIVE" as const,
  operationType: "SERVICE" as const,
  city: "Recife",
  country: "BR",
}

describe("workspace shell presenter", () => {
  it("shows member administration only to owners and administrators", () => {
    expect(toWorkspaceShellViewModel(company, "OWNER").navigation).toEqual([
      { label: "Visão geral", href: "/workspace" },
      { label: "Produtos", href: "/workspace/products" },
      { label: "Ingredientes", href: "/workspace/ingredients" },
      { label: "Estoque", href: "/workspace/stock" },
      { label: "Membros", href: "/workspace/members" },
      { label: "Route flows · temporário", href: "/docs" },
    ])
    expect(toWorkspaceShellViewModel(company, "MEMBER").navigation).toEqual([
      { label: "Visão geral", href: "/workspace" },
      { label: "Produtos", href: "/workspace/products" },
      { label: "Ingredientes", href: "/workspace/ingredients" },
      { label: "Estoque", href: "/workspace/stock" },
      { label: "Route flows · temporário", href: "/docs" },
    ])
  })

  it("does not serialize tenant authority", () => {
    expect(JSON.stringify(toWorkspaceShellViewModel(company, "ADMIN"))).not.toContain("tenant_secret")
  })
})
