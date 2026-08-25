/**
 * Seumei DI container.
 */
import { createInMemoryStore, type KeyValueStore } from "@matriz/platform-storage"
import { createSeumeiRepositories } from "../mock/repositories"
import { createSeumeiUseCases, type SeumeiUseCases } from "../application/use-cases"
import {
  resolveSeumeiContractsGateway,
  type SeumeiContractsGateway,
} from "../integration/gateways/contracts.gateway"
import type { UserId } from "@matriz/foundation-types"
import { createBusinessOsRepositories } from "../mock/business-os.repositories"
import {
  createBusinessOsService,
  type BusinessOsService,
} from "../domains/hub/application/hub.service"
import {
  createCatalogService,
  type CatalogService,
} from "../domains/catalog/application/catalog.service"
import { createFixtureCatalogRepository } from "../mock/catalog.repository"
import { createFixtureStoreRepository } from "../mock/store.repository"
import { createFixtureOrderRepository } from "../mock/order.repository"
import {
  createStorefrontService,
  type StorefrontService,
} from "../domains/store/application/storefront.service"
import type { OrderRepository } from "../domains/orders/domain/order.repository"
import { createOrdersService, type OrdersService } from "../domains/orders/application/orders.service"
import { FIXTURE_ORDERS } from "../fixtures/orders"

export interface SeumeiContainer {
  useCases: SeumeiUseCases
  gateways: { contracts: SeumeiContractsGateway }
}

let cached: SeumeiContainer | undefined

export function getSeumeiContainer(): SeumeiContainer {
  if (cached) return cached
  const store = createInMemoryStore()
  const repos = createSeumeiRepositories(store)
  const useCases = createSeumeiUseCases(repos)
  const contracts = resolveSeumeiContractsGateway()
  cached = { useCases, gateways: { contracts } }
  return cached
}

export function createDemoBusinessOs(userId: UserId): BusinessOsService {
  return createDemoSeumeiRuntime(userId).businessOs
}

export interface DemoSeumeiRuntime {
  readonly businessOs: BusinessOsService
  readonly catalog: CatalogService
  readonly storefront: StorefrontService
  readonly orders: OrderRepository
  readonly ordersOperations: OrdersService
}

export function createDemoSeumeiRuntime(
  userId: UserId,
  domainStorage: KeyValueStore = createInMemoryStore(),
): DemoSeumeiRuntime {
  const repositories = createBusinessOsRepositories({ demoUserId: userId })
  const catalogRepository = createFixtureCatalogRepository({
    memberships: repositories.memberships,
    storage: domainStorage,
  })
  const storeRepository = createFixtureStoreRepository({
    memberships: repositories.memberships,
  })
  const orderRepository = createFixtureOrderRepository({
    memberships: repositories.memberships,
    storage: domainStorage,
    initialOrders: FIXTURE_ORDERS,
  })
  return {
    businessOs: createBusinessOsService(repositories),
    catalog: createCatalogService(catalogRepository),
    storefront: createStorefrontService({
      stores: storeRepository,
      catalog: catalogRepository,
      orders: orderRepository,
    }),
    orders: orderRepository,
    ordersOperations: createOrdersService(orderRepository),
  }
}
