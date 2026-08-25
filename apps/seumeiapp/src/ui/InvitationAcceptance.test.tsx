import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { InvitationAcceptance } from "./InvitationAcceptance"

const push = vi.fn()
const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))

const invitation = {
  companyName: "Oficina Aurora",
  invitedEmail: "new@example.com",
  roleLabel: "Leitor",
  expiresAtLabel: "27/08/2026",
  canAccept: true,
}

describe("InvitationAcceptance", () => {
  afterEach(cleanup)
  beforeEach(() => { push.mockReset(); refresh.mockReset(); vi.restoreAllMocks() })

  it("does not offer acceptance to a different authenticated email", () => {
    render(<InvitationAcceptance token="plain-token" invitation={{ ...invitation, canAccept: false }} />)
    expect(screen.getByText("Entre com new@example.com para aceitar este convite.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Aceitar convite" })).toBeNull()
  })

  it("shows an honest unavailable state", () => {
    render(<InvitationAcceptance token="plain-token" invitation={null} />)
    expect(screen.getByRole("heading", { name: "Convite indisponível" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Aceitar convite" })).toBeNull()
  })

  it("enters the workspace only after persisted acceptance", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ workspace: {} }), { status: 200 }))
    render(<InvitationAcceptance token="plain-token" invitation={invitation} />)
    fireEvent.click(screen.getByRole("button", { name: "Aceitar convite" }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/invitations/accept", expect.objectContaining({ method: "POST" })))
    expect(push).toHaveBeenCalledWith("/workspace")
    expect(refresh).toHaveBeenCalled()
  })

  it("keeps the user on the invitation after a rejected acceptance", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "invitation_unavailable" }), { status: 410 }))
    render(<InvitationAcceptance token="plain-token" invitation={invitation} />)
    fireEvent.click(screen.getByRole("button", { name: "Aceitar convite" }))
    expect(await screen.findByText("Este convite não está mais disponível.")).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
