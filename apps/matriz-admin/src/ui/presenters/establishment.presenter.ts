/**
 * Establishment presenter (L6).
 */
import type { Establishment, EstablishmentStatus } from "../../domain/models"

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger"

export interface EstablishmentViewModel {
  id: string
  name: string
  type: string
  address: string
  city: string
  ownerName: string
  serviceRadiusDisplay: string
  statusLabel: string
  statusTone: BadgeTone
}

const STATUS_LABEL: Record<EstablishmentStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
}

const STATUS_TONE: Record<EstablishmentStatus, BadgeTone> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
}

export function toEstablishmentViewModel(est: Establishment): EstablishmentViewModel {
  return {
    id: est.id as unknown as string,
    name: est.name,
    type: est.type,
    address: est.address,
    city: est.city,
    ownerName: est.ownerName,
    serviceRadiusDisplay: `${est.serviceRadiusKm} km`,
    statusLabel: STATUS_LABEL[est.status],
    statusTone: STATUS_TONE[est.status],
  }
}
