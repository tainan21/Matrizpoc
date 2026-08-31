import type { ClientPortalData } from "../domain"
import type { ClientAdminRepository } from "../ports"

export function createMemoryClientAdminRepository(seed: Partial<ClientPortalData> = {}): ClientAdminRepository & { fail(error: Error): void } {
  let failure: Error | null = null
  const data: ClientPortalData = { systems: seed.systems ?? [], sources: seed.sources ?? [], snapshots: seed.snapshots ?? [], payments: seed.payments ?? [] }
  return {
    fail(error) { failure = error },
    async load(tenantId) {
      if (failure) throw failure
      return {
        systems: data.systems.filter((row) => row.tenantId === tenantId),
        sources: data.sources.filter((row) => row.tenantId === tenantId),
        snapshots: data.snapshots.filter((row) => row.tenantId === tenantId),
        payments: data.payments.filter((row) => row.tenantId === tenantId),
      }
    },
  }
}
