import { getHubDb, type HubPrismaClient } from "@matriz/platform-db/hub"
import { withTenantContext } from "@matriz/platform-db/tenant-context"
import type { ClientPortalData, ClientPortalPaymentRecord, ClientPortalSnapshotRecord, ClientPortalSourceRecord, ClientPortalSystemRecord } from "../domain"
import type { ClientAdminRepository } from "../ports"
import { createGa4Adapter, createVercelAdapter, type ProviderRefreshResult } from "./provider-adapters"

async function persistProviderResult(db: HubPrismaClient, tenantId: string, source: { id: string; provider: string; label: string; kind: string }, result: ProviderRefreshResult) {
  await withTenantContext(db, tenantId, async (transaction) => {
    const attemptedAt = new Date()
    await transaction.clientPortalDataSource.upsert({
      where: { tenantId_id: { tenantId, id: source.id } },
      update: { state: result.state, lastAttemptAt: attemptedAt, ...(result.state === "fresh" ? { lastSuccessAt: new Date(result.capturedAt!) } : {}) },
      create: { tenantId, id: source.id, provider: source.provider, label: source.label, state: result.state, lastAttemptAt: attemptedAt, lastSuccessAt: result.state === "fresh" ? new Date(result.capturedAt!) : null },
    })
    if (result.state === "fresh") await transaction.clientPortalSnapshot.create({ data: { tenantId, sourceId: source.id, kind: source.kind, state: "fresh", capturedAt: new Date(result.capturedAt!), payload: result.payload as object } })
  })
}

export function createPrismaClientAdminRepository(db: HubPrismaClient = getHubDb()): ClientAdminRepository {
  return {
    async refresh(tenantId) {
      const definitions = [
        { source: { id: "vercel-default", provider: "vercel", label: "Vercel", kind: "system_health" }, adapter: createVercelAdapter(process.env) },
        { source: { id: "ga4-default", provider: "ga4", label: "Google Analytics", kind: "analytics" }, adapter: createGa4Adapter(process.env) },
      ] as const
      const settled = await Promise.allSettled(definitions.map(async ({ source, adapter }) => persistProviderResult(db, tenantId, source, await adapter.refresh())))
      if (settled.every((result) => result.status === "rejected")) throw new Error("All client-admin refreshes failed")
    },
    async load(tenantId): Promise<ClientPortalData> {
      const [systemsResult, sourcesResult, snapshotsResult, paymentsResult] = await Promise.allSettled([
        withTenantContext(db, tenantId, (transaction) => transaction.clientPortalSystem.findMany({ where: { tenantId, enabled: true }, orderBy: { name: "asc" } })),
        withTenantContext(db, tenantId, (transaction) => transaction.clientPortalDataSource.findMany({ where: { tenantId }, orderBy: { label: "asc" } })),
        withTenantContext(db, tenantId, (transaction) => transaction.clientPortalSnapshot.findMany({ where: { tenantId }, orderBy: { capturedAt: "desc" }, take: 500 })),
        withTenantContext(db, tenantId, (transaction) => transaction.clientPortalPaymentProjection.findMany({ where: { tenantId }, orderBy: { dueAt: "desc" }, take: 200 })),
      ])
      if ([systemsResult, sourcesResult, snapshotsResult, paymentsResult].every((result) => result.status === "rejected")) throw new Error("Client Admin database unavailable")
      const systems = systemsResult.status === "fulfilled" ? systemsResult.value : []
      const sources = sourcesResult.status === "fulfilled" ? sourcesResult.value : []
      const snapshots = snapshotsResult.status === "fulfilled" ? snapshotsResult.value : []
      const payments = paymentsResult.status === "fulfilled" ? paymentsResult.value : []
      const unavailableSections = [
        ...(systemsResult.status === "rejected" || sourcesResult.status === "rejected" || snapshotsResult.status === "rejected" ? ["systems"] as const : []),
        ...(snapshotsResult.status === "rejected" ? ["site"] as const : []),
        ...(paymentsResult.status === "rejected" ? ["payments"] as const : []),
        ...(sourcesResult.status === "rejected" ? ["integrations"] as const : []),
      ]
      return {
        systems: systems.map((row): ClientPortalSystemRecord => ({ ...row, category: row.category as ClientPortalSystemRecord["category"], createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
        sources: sources.map((row): ClientPortalSourceRecord => ({ ...row, provider: row.provider as ClientPortalSourceRecord["provider"], state: row.state as ClientPortalSourceRecord["state"], lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null, lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null })),
        snapshots: snapshots.map((row): ClientPortalSnapshotRecord => ({ ...row, kind: row.kind as ClientPortalSnapshotRecord["kind"], state: row.state as ClientPortalSnapshotRecord["state"], capturedAt: row.capturedAt.toISOString(), payload: row.payload })),
        payments: payments.map((row): ClientPortalPaymentRecord => ({ ...row, status: row.status as ClientPortalPaymentRecord["status"], dueAt: row.dueAt.toISOString(), paidAt: row.paidAt?.toISOString() ?? null, lastSyncedAt: row.lastSyncedAt.toISOString() })),
        unavailableSections,
      }
    },
  }
}
