import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CompanyOnboarding } from "./CompanyOnboarding"

const push = vi.fn()
const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))

const base = { companyName: "Oficina Aurora", companySlug: "oficina-aurora", currentStep: "OPERATION" as const, currentStepLabel: "Operação", version: 3, progressPercent: 25, operationType: null, city: "", country: "BR", currency: "BRL" as const }

describe("CompanyOnboarding", () => {
  afterEach(cleanup)
  beforeEach(() => { push.mockReset(); refresh.mockReset(); vi.restoreAllMocks() })

  it("resumes the persisted step and focuses the first invalid field", async () => {
    render(<CompanyOnboarding onboarding={base} />)
    expect(screen.getByText("Etapa 2 de 4 · Operação")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }))
    expect(await screen.findByText("Escolha como a empresa opera.")).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Loja física" })).toHaveFocus()
  })

  it("offers a reload action after a stale-version conflict", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "onboarding_conflict" }), { status: 409 }))
    render(<CompanyOnboarding onboarding={{ ...base, currentStep: "PREFERENCES", currentStepLabel: "Preferências", operationType: "SERVICE", city: "Recife" }} />)
    fireEvent.click(screen.getByRole("button", { name: "Salvar e continuar" }))
    expect(await screen.findByText("O progresso mudou em outra sessão.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Recarregar progresso" }))
    expect(refresh).toHaveBeenCalled()
  })

  it("completes review and enters the workspace", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ workspace: {} }), { status: 200 }))
    render(<CompanyOnboarding onboarding={{ ...base, currentStep: "REVIEW", currentStepLabel: "Revisão", progressPercent: 75, operationType: "HYBRID", city: "Recife" }} />)
    fireEvent.click(screen.getByRole("button", { name: "Concluir configuração" }))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/workspace"))
  })
})
