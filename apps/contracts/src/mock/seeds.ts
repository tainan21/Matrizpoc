import { asTenantId, asISODate } from "@matriz/foundation-types"
import type { Contract, ContractTemplate, Counterparty, ContractId, ContractTemplateId, CounterpartyId } from "../domain/models"

const ACME = asTenantId("tenant-acme")
const SUNSET = asTenantId("tenant-sunset")
const NOW = asISODate("2026-01-10T10:00:00.000Z")

export const seedTemplates: ContractTemplate[] = [
  {
    id: "tpl-performance" as ContractTemplateId,
    tenantId: ACME,
    name: "Apresentacao musical padrao",
    description: "Template para shows de bandas em estabelecimentos.",
    category: "performance",
    body: "Contrato de apresentacao artistica...",
    active: true,
    createdAt: NOW,
  },
  {
    id: "tpl-service-acme" as ContractTemplateId,
    tenantId: ACME,
    name: "Prestacao de servico padrao",
    description: "Servicos recorrentes para estabelecimentos.",
    category: "service",
    body: "Contrato de prestacao de servico...",
    active: true,
    createdAt: NOW,
  },
  {
    id: "tpl-performance-sunset" as ContractTemplateId,
    tenantId: SUNSET,
    name: "Apresentacao musical - Sunset",
    description: "Template para shows no Sunset.",
    category: "performance",
    body: "Contrato Sunset de performance...",
    active: true,
    createdAt: NOW,
  },
]

export const seedCounterparties: Counterparty[] = [
  {
    id: "cp-matriz" as CounterpartyId,
    tenantId: ACME,
    displayName: "Matriz Bar",
    document: "11.222.333/0001-44",
    email: "contato@matriz.bar",
    createdAt: NOW,
  },
  {
    id: "cp-local" as CounterpartyId,
    tenantId: ACME,
    displayName: "Local Food Truck",
    email: "financeiro@localfood.com",
    createdAt: NOW,
  },
]

export const seedContracts: Contract[] = [
  {
    id: "ctr-001" as ContractId,
    tenantId: ACME,
    templateId: "tpl-performance" as ContractTemplateId,
    counterpartyId: "cp-matriz" as CounterpartyId,
    title: "Contrato show Matriz Bar - Fev",
    originApp: "contracts",
    status: "signed",
    amount: 3200,
    currency: "BRL",
    effectiveFrom: asISODate("2026-02-10T00:00:00.000Z"),
    effectiveTo: asISODate("2026-02-10T23:59:59.000Z"),
    parties: [
      { name: "Matriz Bar", role: "Venue" },
      { name: "Acme Productions", role: "Owner" },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "ctr-002" as ContractId,
    tenantId: ACME,
    templateId: "tpl-service-acme" as ContractTemplateId,
    counterpartyId: "cp-local" as CounterpartyId,
    title: "Servico Local Food Truck",
    originApp: "contracts",
    status: "pending",
    amount: 1500,
    currency: "BRL",
    effectiveFrom: asISODate("2026-01-20T00:00:00.000Z"),
    parties: [
      { name: "Local Food Truck", role: "Provider" },
      { name: "Acme Productions", role: "Owner" },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  },
]
