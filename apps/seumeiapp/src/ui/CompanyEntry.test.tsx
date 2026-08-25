import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CompanyEntry } from "./CompanyEntry"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))

describe("CompanyEntry", () => {
  afterEach(cleanup)
  beforeEach(() => { push.mockReset(); vi.restoreAllMocks() })

  it("shows an honest empty state and an accessible creation form without tenant input", () => {
    render(<CompanyEntry initialCompanies={[]} />)
    expect(screen.getByText("Nenhuma empresa por aqui ainda.")).toBeInTheDocument()
    expect(screen.getByLabelText("Nome da empresa")).toBeInTheDocument()
    expect(screen.queryByLabelText(/tenant/i)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain("tenantId")
  })

  it("renders only authorized choices and selects one", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ company: {} }), { status: 200 }))
    render(<CompanyEntry initialCompanies={[{ id: "company_a", name: "Oficina Aurora", slug: "oficina-aurora", statusLabel: "Empresa ativa", actionLabel: "Abrir workspace" }]} />)
    fireEvent.click(screen.getByRole("button", { name: "Abrir workspace" }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/company-selection", expect.objectContaining({ method: "POST" })))
    expect(push).toHaveBeenCalledWith("/workspace")
  })

  it("disables submit while pending and recovers from a slug conflict", async () => {
    let release: ((value: Response) => void) | undefined
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(resolve => { release = resolve }))
    render(<CompanyEntry initialCompanies={[]} />)
    fireEvent.change(screen.getByLabelText("Nome da empresa"), { target: { value: "Oficina Aurora" } })
    fireEvent.submit(screen.getByRole("button", { name: "Criar empresa" }).closest("form")!)
    expect(screen.getByRole("button", { name: "Criando…" })).toBeDisabled()
    release!(new Response(JSON.stringify({ error: "company_slug_conflict" }), { status: 409 }))
    expect(await screen.findByText("Esse endereço já está em uso. Escolha outro.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Criar empresa" })).toBeEnabled()
  })

  it("renders unavailable infrastructure honestly", () => {
    render(<CompanyEntry initialCompanies={[]} availability="unavailable" />)
    expect(screen.getByRole("heading", { name: "Seumei temporariamente indisponível" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Criar empresa" })).not.toBeInTheDocument()
  })
})
