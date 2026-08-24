import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { asTenantId, asUserId } from "@matriz/foundation-types"
import type { AuthSession } from "@matriz/platform-auth"
import {
  AuthContext,
  type AuthContextValue,
} from "@matriz/platform-auth/client"
import { asCompanyId } from "../../companies/domain/company"
import {
  SeumeiTenantProvider,
  useSeumeiTenant,
} from "./SeumeiTenantProvider"

const session: AuthSession = {
  identity: {
    user: {
      id: asUserId("user-demo-seumei"),
      name: "Tai Demo",
      email: "demo@seumei.local",
    },
    tenants: [],
  },
  activeTenantId: asTenantId("tenant_demo"),
  issuedAt: "2026-08-24T12:00:00.000Z",
  expiresAt: "2027-08-24T12:00:00.000Z",
  strategyId: "email",
}

const auth: AuthContextValue = {
  status: "signed-in",
  session,
  error: null,
  strategies: [],
  defaultStrategyId: "email",
  start: vi.fn(),
  verify: vi.fn(),
  acceptSession: vi.fn(),
  signOut: vi.fn(),
  refresh: vi.fn(),
  setActiveTenant: vi.fn(),
}

function Probe() {
  const tenant = useSeumeiTenant()
  return (
    <div>
      <span>{tenant.current?.company.name ?? tenant.status}</span>
      {tenant.error ? <div role="alert">{tenant.error}</div> : null}
      <button
        type="button"
        onClick={() => tenant.switchCompany(asCompanyId("company-unknown"))}
      >
        Trocar para empresa inválida
      </button>
    </div>
  )
}

describe("SeumeiTenantProvider", () => {
  it("keeps the valid company when an invalid switch is requested", async () => {
    render(
      <AuthContext.Provider value={auth}>
        <SeumeiTenantProvider>
          <Probe />
        </SeumeiTenantProvider>
      </AuthContext.Provider>,
    )

    await screen.findByText("Galáxia Burger")
    fireEvent.click(screen.getByRole("button", { name: /empresa inválida/i }))

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Empresa não disponível para esta conta.",
      ),
    )
    expect(screen.getByText("Galáxia Burger")).toBeInTheDocument()
  })
})
