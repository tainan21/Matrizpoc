import "@testing-library/jest-dom/vitest"
import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { EstablishmentActions } from "./EstablishmentActions"

vi.mock("../../src/lib/container", () => ({
  getSeumeiContainer: () => ({
    useCases: {
      getEstablishment: async () => ({
        id: "establishment-1",
        tenantId: "tenant-1",
        name: "Casa Matriz",
        type: "Restaurante",
        address: "Rua das Flores, 10",
        city: "Sao Paulo",
        serviceRadiusKm: 5,
        status: "active",
        ownerName: "Ana Souza",
        createdAt: "2026-08-15T00:00:00.000Z",
        updatedAt: "2026-08-15T00:00:00.000Z",
      }),
    },
    gateways: {
      contracts: {
        requestContractFromEstablishment: async () => ({ id: "contract-42" }),
      },
    },
  }),
}))

describe("EstablishmentActions", () => {
  it("connects a successful contract request to visible live feedback", async () => {
    render(
      <EstablishmentActions
        establishmentId="establishment-1"
        establishmentName="Casa Matriz"
        tenantId={"tenant-1" as never}
      />,
    )

    const button = screen.getByRole("button", { name: "Solicitar contrato de prestacao" })
    expect(button).not.toHaveAttribute("aria-describedby")

    fireEvent.click(button)

    const status = await screen.findByRole("status")
    expect(status).toHaveAttribute("id", "contract-request-status")
    expect(status).toHaveTextContent("Contrato solicitado: contract-42")
    expect(status).toHaveTextContent("✓")
    expect(screen.getByText("✓")).toHaveAttribute("aria-hidden", "true")
    expect(button).toHaveAttribute("aria-describedby", "contract-request-status")
    expect(button).toHaveAccessibleDescription("Contrato solicitado: contract-42")
  })
})
