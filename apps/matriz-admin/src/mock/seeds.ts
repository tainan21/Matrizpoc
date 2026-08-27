/**
 * Seumei mock seeds (L5).
 */
import { asTenantId, asISODate } from "@matriz/foundation-types"
import type {
  Establishment,
  ServiceOffering,
  OwnerProfile,
  EstablishmentId,
  ServiceOfferingId,
  OwnerProfileId,
} from "../domain/models"

const TENANT_MATRIZ = asTenantId("tenant-matriz")
const TENANT_ACME = asTenantId("tenant-acme")

export const SEED_ESTABLISHMENTS: readonly Establishment[] = [
  {
    id: "est-matriz-bar" as EstablishmentId,
    tenantId: TENANT_MATRIZ,
    name: "Bar da Matriz",
    type: "bar",
    address: "Rua das Palmeiras 123",
    city: "Sao Paulo",
    serviceRadiusKm: 15,
    status: "active",
    ownerName: "Joana Silva",
    createdAt: asISODate("2025-01-20T08:00:00.000Z"),
    updatedAt: asISODate("2025-04-01T10:00:00.000Z"),
  },
  {
    id: "est-clube-samba" as EstablishmentId,
    tenantId: TENANT_MATRIZ,
    name: "Clube do Samba",
    type: "clube",
    address: "Av. Atlantica 4500",
    city: "Rio de Janeiro",
    serviceRadiusKm: 25,
    status: "active",
    ownerName: "Ricardo Almeida",
    createdAt: asISODate("2025-02-05T09:00:00.000Z"),
    updatedAt: asISODate("2025-03-15T12:00:00.000Z"),
  },
  {
    id: "est-acme-arena" as EstablishmentId,
    tenantId: TENANT_ACME,
    name: "Arena BH",
    type: "arena",
    address: "Av. Afonso Pena 9000",
    city: "Belo Horizonte",
    serviceRadiusKm: 40,
    status: "draft",
    ownerName: "Carlos Dias",
    createdAt: asISODate("2025-03-12T09:00:00.000Z"),
    updatedAt: asISODate("2025-03-12T09:00:00.000Z"),
  },
]

export const SEED_SERVICE_OFFERINGS: readonly ServiceOffering[] = [
  {
    id: "off-matriz-bar-evento" as ServiceOfferingId,
    tenantId: TENANT_MATRIZ,
    establishmentId: "est-matriz-bar" as EstablishmentId,
    title: "Espaco para evento",
    description: "Palco, som basico e luz.",
    pricePerHour: 300,
    currency: "BRL",
    createdAt: asISODate("2025-02-10T10:00:00.000Z"),
  },
  {
    id: "off-clube-samba-show" as ServiceOfferingId,
    tenantId: TENANT_MATRIZ,
    establishmentId: "est-clube-samba" as EstablishmentId,
    title: "Palco principal",
    description: "Palco 8x6, som + luz, camarins.",
    pricePerHour: 800,
    currency: "BRL",
    createdAt: asISODate("2025-02-15T11:00:00.000Z"),
  },
]

export const SEED_OWNER_PROFILES: readonly OwnerProfile[] = [
  {
    id: "own-matriz-bar" as OwnerProfileId,
    tenantId: TENANT_MATRIZ,
    establishmentId: "est-matriz-bar" as EstablishmentId,
    ownerName: "Joana Silva",
    email: "joana@matrizbar.example",
    bio: "Proprietaria ha 10 anos, foco em eventos culturais.",
    createdAt: asISODate("2025-01-20T08:30:00.000Z"),
  },
  {
    id: "own-clube-samba" as OwnerProfileId,
    tenantId: TENANT_MATRIZ,
    establishmentId: "est-clube-samba" as EstablishmentId,
    ownerName: "Ricardo Almeida",
    email: "ricardo@clubesamba.example",
    bio: "Produtor musical.",
    createdAt: asISODate("2025-02-05T09:30:00.000Z"),
  },
]
