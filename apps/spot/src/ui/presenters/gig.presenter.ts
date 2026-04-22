/**
 * Gig presenter (L6).
 *
 * Converte entity interna `Gig` em `GigViewModel` formatado. Componentes
 * de tela consomem SOMENTE `GigViewModel`, nao a entity. Isso protege a
 * UI contra refactors no domain.
 */
import type { Gig, GigStatus } from "../../domain/models"

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger"

export interface GigViewModel {
  id: string
  title: string
  bandId: string
  venue: string
  city: string
  scheduledForDisplay: string
  durationDisplay: string
  cacheDisplay: string
  statusLabel: string
  statusTone: BadgeTone
  notes?: string
}

const STATUS_LABEL: Record<GigStatus, string> = {
  draft: "Rascunho",
  published: "Publicada",
  booked: "Reservada",
  cancelled: "Cancelada",
  finished: "Encerrada",
}

const STATUS_TONE: Record<GigStatus, BadgeTone> = {
  draft: "neutral",
  published: "success",
  booked: "brand",
  cancelled: "danger",
  finished: "warning",
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatCurrency(amount: number, currency: "BRL" | "USD"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount)
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h${m.toString().padStart(2, "0")}`
}

export function toGigViewModel(gig: Gig): GigViewModel {
  return {
    id: gig.id as unknown as string,
    title: gig.title,
    bandId: gig.bandId as unknown as string,
    venue: gig.venue,
    city: gig.city,
    scheduledForDisplay: formatDate(gig.scheduledFor as unknown as string),
    durationDisplay: formatDuration(gig.durationMinutes),
    cacheDisplay: formatCurrency(gig.cacheAmount, gig.currency),
    statusLabel: STATUS_LABEL[gig.status],
    statusTone: STATUS_TONE[gig.status],
    notes: gig.notes,
  }
}
