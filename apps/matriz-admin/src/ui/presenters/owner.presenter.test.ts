import { describe, expect, it } from "vitest"
import type { Establishment, OwnerProfile } from "../../domain/models"

import { toOwnerViewModel } from "./owner.presenter"

const establishment = {
  id: "establishment-1",
  tenantId: "tenant-1",
  name: "Casa Matriz",
  type: "Restaurante",
  address: "Rua das Flores, 10",
  city: "Sao Paulo",
  serviceRadiusKm: 5,
  status: "active",
  ownerName: "Nome legado",
  createdAt: "2026-08-15T00:00:00.000Z",
  updatedAt: "2026-08-15T00:00:00.000Z",
} as Establishment

describe("toOwnerViewModel", () => {
  it("maps owner and establishment entities into display-only owner data", () => {
    const owner = {
      id: "owner-1",
      tenantId: "tenant-1",
      establishmentId: establishment.id,
      ownerName: "Ana Souza",
      email: "ana@casamatriz.test",
      phone: "+55 11 99999-0000",
      bio: "Responsavel pela operacao.",
      createdAt: "2026-08-15T00:00:00.000Z",
    } as OwnerProfile

    expect(toOwnerViewModel(owner, establishment)).toEqual({
      id: "owner-1",
      ownerName: "Ana Souza",
      email: "ana@casamatriz.test",
      phoneDisplay: "+55 11 99999-0000",
      bio: "Responsavel pela operacao.",
      establishmentName: "Casa Matriz",
      establishmentLocation: "Sao Paulo",
    })
  })

  it("uses an explicit unavailable label when the optional phone is absent", () => {
    const owner = {
      id: "owner-2",
      tenantId: "tenant-1",
      establishmentId: establishment.id,
      ownerName: "Bruno Lima",
      email: "bruno@casamatriz.test",
      bio: "Socio administrador.",
      createdAt: "2026-08-15T00:00:00.000Z",
    } as OwnerProfile

    expect(toOwnerViewModel(owner, establishment).phoneDisplay).toBe("Nao informado")
  })
})
