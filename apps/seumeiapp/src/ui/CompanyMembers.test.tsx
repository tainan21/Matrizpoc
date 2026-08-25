import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CompanyMembers } from "./CompanyMembers"
import type { MemberDirectoryViewModel } from "./presenters/membership.presenter"

const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))

const directory: MemberDirectoryViewModel = {
  companyName: "Oficina Aurora",
  actorRoleLabel: "Proprietário",
  availableInvitationRoles: [
    { value: "ADMIN", label: "Administrador" },
    { value: "MEMBER", label: "Membro" },
    { value: "VIEWER", label: "Leitor" },
  ],
  members: [
    { id: "owner", name: "Ana", email: "ana@example.com", role: "OWNER", roleLabel: "Proprietário", joinedAtLabel: "20/08/2026", isCurrentUser: true, canChangeRole: false, canRemove: false, availableRoles: [] },
    { id: "member", name: "Bia", email: "bia@example.com", role: "MEMBER", roleLabel: "Membro", joinedAtLabel: "20/08/2026", isCurrentUser: false, canChangeRole: true, canRemove: true, availableRoles: [{ value: "MEMBER", label: "Membro" }, { value: "VIEWER", label: "Leitor" }] },
  ],
  invitations: [],
}

describe("CompanyMembers", () => {
  afterEach(cleanup)
  beforeEach(() => { refresh.mockReset(); vi.restoreAllMocks() })

  it("renders an accessible invitation form and protects owner controls", () => {
    render(<CompanyMembers directory={directory} />)
    expect(screen.getByLabelText("E-mail do novo membro")).toBeInTheDocument()
    expect(screen.getByLabelText("Papel inicial")).toBeInTheDocument()
    expect(screen.queryByLabelText(/tenant/i)).toBeNull()
    expect(screen.queryByRole("button", { name: "Remover Ana" })).toBeNull()
    expect(screen.getByRole("button", { name: "Remover Bia" })).toBeInTheDocument()
  })

  it("shows an honest manual-share result after persisted invitation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ invitation: { email: "new@example.com" }, sharePath: "/invite/plain-token" }), { status: 201 }))
    render(<CompanyMembers directory={directory} />)
    fireEvent.change(screen.getByLabelText("E-mail do novo membro"), { target: { value: "new@example.com" } })
    fireEvent.change(screen.getByLabelText("Papel inicial"), { target: { value: "VIEWER" } })
    fireEvent.click(screen.getByRole("button", { name: "Criar convite" }))

    expect(await screen.findByText("Convite criado. Nenhum e-mail foi enviado.")).toBeInTheDocument()
    expect(screen.getByDisplayValue("/invite/plain-token")).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith("/api/members/invitations", expect.objectContaining({ method: "POST" }))
  })

  it("persists a role change before refreshing the directory", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ member: {} }), { status: 200 }))
    render(<CompanyMembers directory={directory} />)
    fireEvent.change(screen.getByLabelText("Papel de Bia"), { target: { value: "VIEWER" } })
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/members/member", expect.objectContaining({ method: "PATCH" })))
    expect(refresh).toHaveBeenCalled()
  })
})
