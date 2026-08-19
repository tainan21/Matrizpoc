import { getSeumeiDb } from "@matriz/platform-db/seumei"
import { makeEstablishmentRepo } from "@matriz/platform-db/seumei/repositories"
import type { EstablishmentSummaryRepository } from "../application/read-home-summary"

export function createEstablishmentSummaryRepository(): EstablishmentSummaryRepository {
  const repository = makeEstablishmentRepo(getSeumeiDb())
  return {
    async listByTenant(tenantId) {
      const rows = await repository.listByTenant(tenantId)
      return rows.map(({ id, name, city, status }) => ({ id, name, city, status }))
    },
  }
}
