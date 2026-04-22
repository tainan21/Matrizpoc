import type { Contract, ContractStatus } from "../../domain/models"

export interface ContractViewModel {
  id: string
  title: string
  statusLabel: string
  statusTone: "neutral" | "brand" | "success" | "warning" | "danger"
  amountDisplay: string
  effectiveFromDisplay: string
  originLabel: string
  externalReference?: string
}

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Rascunho",
  pending: "Pendente de assinatura",
  signed: "Assinado",
  cancelled: "Cancelado",
}

const STATUS_TONES: Record<ContractStatus, ContractViewModel["statusTone"]> = {
  draft: "neutral",
  pending: "warning",
  signed: "success",
  cancelled: "danger",
}

const ORIGIN_LABELS: Record<string, string> = {
  spot: "Spot (show)",
  seumei: "Seumei (estabelecimento)",
  contracts: "Manual",
  "matriz-hub": "Hub",
  willdash: "Willdash",
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function toContractViewModel(c: Contract): ContractViewModel {
  return {
    id: c.id,
    title: c.title,
    statusLabel: STATUS_LABELS[c.status],
    statusTone: STATUS_TONES[c.status],
    amountDisplay: formatAmount(c.amount, c.currency),
    effectiveFromDisplay: formatDate(c.effectiveFrom as unknown as string),
    originLabel: ORIGIN_LABELS[c.originApp] ?? c.originApp,
    externalReference: c.externalReference,
  }
}
