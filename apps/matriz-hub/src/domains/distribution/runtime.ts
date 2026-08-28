import { timingSafeEqual } from "node:crypto"
import { createDistributionHttpHandlers } from "./application/distribution-http"
import { DistributionService } from "./application/distribution-service"
import { seedInitialDistributionCatalog } from "./application/initial-catalog"
import { createMemoryDistributionRepository } from "./integration/memory-distribution-repository"
import { createPrismaDistributionRepository } from "./integration/prisma-distribution-repository"

const globalRuntime = globalThis as typeof globalThis & {
  __matrizDistributionService?: DistributionService
}
const repository = process.env.HUB_DATABASE_URL
  ? createPrismaDistributionRepository()
  : createMemoryDistributionRepository()
export const distributionService = (globalRuntime.__matrizDistributionService ??=
  new DistributionService(repository))
const ready = seedInitialDistributionCatalog(distributionService)

function serviceActor(request: Request) {
  const expected = process.env.MATRIZ_DISTRIBUTION_ADMIN_TOKEN ?? ""
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (
    expected.length < 16 ||
    provided.length !== expected.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  )
    return null
  return { userId: "service:matriz-admin", capabilities: ["distribution.catalog.manage"] }
}

export const distributionHttp = createDistributionHttpHandlers(distributionService, {
  authorize: serviceActor,
  ready,
})
