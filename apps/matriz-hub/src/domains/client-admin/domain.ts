export type ClientPortalSystemRecord = Readonly<{
  id: string
  tenantId: string
  name: string
  purpose: string
  category: "site" | "internal_app" | "service"
  publicUrl: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}>

export type ClientPortalSourceRecord = Readonly<{
  id: string
  tenantId: string
  systemId: string | null
  provider: "vercel" | "ga4" | "http" | "manual" | "future"
  label: string
  state: "fresh" | "stale" | "empty" | "not_configured" | "unavailable" | "error"
  lastAttemptAt: string | null
  lastSuccessAt: string | null
}>

export type ClientPortalSnapshotRecord = Readonly<{
  id: string
  tenantId: string
  sourceId: string
  kind: "system_health" | "usage" | "access" | "site" | "analytics"
  state: "fresh" | "stale" | "empty" | "unavailable" | "error"
  capturedAt: string
  payload: unknown
}>

export type ClientPortalPaymentRecord = Readonly<{
  id: string
  tenantId: string
  description: string
  amountCents: number
  currency: string
  status: "pending" | "paid" | "overdue" | "cancelled"
  dueAt: string
  paidAt: string | null
  externalReference: string | null
  lastSyncedAt: string
}>

export type ClientPortalData = Readonly<{
  systems: readonly ClientPortalSystemRecord[]
  sources: readonly ClientPortalSourceRecord[]
  snapshots: readonly ClientPortalSnapshotRecord[]
  payments: readonly ClientPortalPaymentRecord[]
  unavailableSections?: readonly ("systems" | "site" | "payments" | "integrations")[]
}>
