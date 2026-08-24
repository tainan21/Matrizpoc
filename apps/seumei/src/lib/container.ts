/**
 * Seumei DI container.
 */
import { createInMemoryStore } from "@matriz/platform-storage"
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
  return createBusinessOsService(
    createBusinessOsRepositories({ demoUserId: userId }),
  )
}
