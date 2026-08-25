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
      { label: "Pedidos", href: "/workspace/orders" },
      { label: "Clientes", href: "/workspace/customers" },
      { label: "Financeiro", href: "/workspace/finance" },
      { label: "Membros", href: "/workspace/members" },
      { label: "Route flows · temporário", href: "/docs" },
    ])
    expect(toWorkspaceShellViewModel(company, "MEMBER").navigation).toEqual([
      { label: "Visão geral", href: "/workspace" },
      { label: "Produtos", href: "/workspace/products" },
      { label: "Ingredientes", href: "/workspace/ingredients" },
      { label: "Estoque", href: "/workspace/stock" },
      { label: "Pedidos", href: "/workspace/orders" },
      { label: "Clientes", href: "/workspace/customers" },
      { label: "Route flows · temporário", href: "/docs" },
    ])
    expect(toWorkspaceShellViewModel(company, "ADMIN").navigation).toContainEqual({ label: "Financeiro", href: "/workspace/finance" })
    expect(toWorkspaceShellViewModel(company, "VIEWER").navigation).not.toContainEqual({ label: "Financeiro", href: "/workspace/finance" })
  })

  it("does not serialize tenant authority", () => {
    expect(JSON.stringify(toWorkspaceShellViewModel(company, "ADMIN"))).not.toContain("tenant_secret")
  })
})
