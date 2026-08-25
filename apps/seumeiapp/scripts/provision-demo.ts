import { getCoreDb } from "@matriz/platform-db/core"
import { getSeumeiDb } from "@matriz/platform-db/seumei"
import { provisionDemoFederation } from "../src/application/provision-demo-federation"
import { provisionDemoRestaurantData, reconcileDemoOrderReceipts } from "../src/application/provision-demo-restaurant"
import { createCatalogRepository } from "../src/infrastructure/catalog.repository"
import { createCompanyRepository } from "../src/infrastructure/company.repository"
import { createCoreAccessRepository } from "../src/infrastructure/core-access.repository"
import { createRestaurantRepository } from "../src/infrastructure/restaurant.repository"
import { createCommerceRepository } from "../src/infrastructure/commerce.repository"
import { createFinanceRepository } from "../src/infrastructure/finance.repository"

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
  const commerce = createCommerceRepository(seumeiDb)
  const finance = createFinanceRepository(seumeiDb)
  for (const company of result.companies) {
    await provisionDemoRestaurantData({ userId: result.ownerUserId, role: "OWNER", company }, catalog, restaurant)
    await commerce.publishStore(company.tenantId, company.id, {
      storeSlug: company.slug,
      displayName: company.name,
      description: company.slug === "galaxia-burger" ? "Smashes artesanais preparados com receitas e estoque conectados." : "Sabores brasileiros preparados na brasa.",
    })
  }
  const galaxia = result.companies.find(({ slug }) => slug === "galaxia-burger")!
  const galaxiaProducts = await catalog.listProducts(galaxia.tenantId)
  const smash = galaxiaProducts.find(({ slug }) => slug === "galaxia-smash")!
  await commerce.checkoutPublishedStore("galaxia-burger", {
    variantId: smash.variants[0]!.id,
    quantity: 1,
    customer: { name: "Cliente Demo Galaxia", email: "cliente@galaxiaburger.demo", phone: "5511999990000" },
    idempotencyKey: "demo-galaxia-first-order-v1",
  })
  for (const company of result.companies) {
    const orders = await commerce.listOrders(company.tenantId)
    await reconcileDemoOrderReceipts(company.tenantId, orders.map(({ id }) => id), finance)
  }
  process.stdout.write(`${JSON.stringify({ companies: result.companies.map(({ id, tenantId, name, slug, status }) => ({ id, tenantId, name, slug, status })) }, null, 2)}\n`)
} finally {
  await Promise.all([coreDb.$disconnect(), seumeiDb.$disconnect()])
}
