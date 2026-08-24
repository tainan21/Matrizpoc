import { getCoreDb } from "@matriz/platform-db/core"
import { getSeumeiDb } from "@matriz/platform-db/seumei"
import { provisionDemoFederation } from "../src/application/provision-demo-federation"
import { provisionDemoRestaurantData } from "../src/application/provision-demo-restaurant"
import { createCatalogRepository } from "../src/infrastructure/catalog.repository"
import { createCompanyRepository } from "../src/infrastructure/company.repository"
import { createCoreAccessRepository } from "../src/infrastructure/core-access.repository"
import { createRestaurantRepository } from "../src/infrastructure/restaurant.repository"

const coreDb = getCoreDb()
const seumeiDb = getSeumeiDb()

try {
  const result = await provisionDemoFederation(
    process.env,
    createCoreAccessRepository(coreDb),
    createCompanyRepository(seumeiDb),
  )
  const catalog = createCatalogRepository(seumeiDb)
  const restaurant = createRestaurantRepository(seumeiDb)
  for (const company of result.companies) {
    await provisionDemoRestaurantData({ userId: result.ownerUserId, role: "OWNER", company }, catalog, restaurant)
  }
  process.stdout.write(`${JSON.stringify({ companies: result.companies.map(({ id, tenantId, name, slug, status }) => ({ id, tenantId, name, slug, status })) }, null, 2)}\n`)
} finally {
  await Promise.all([coreDb.$disconnect(), seumeiDb.$disconnect()])
}
