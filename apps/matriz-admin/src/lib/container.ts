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

export interface SeumeiContainer {
  useCases: SeumeiUseCases
  gateways: { contracts: SeumeiContractsGateway }
}

let cached: SeumeiContainer | undefined

export function createSeumeiContainer(store: KeyValueStore): SeumeiContainer {
  const repos = createSeumeiRepositories(store)
  const useCases = createSeumeiUseCases(repos)
  const contracts = resolveSeumeiContractsGateway()
  return { useCases, gateways: { contracts } }
}

export function getSeumeiContainer(): SeumeiContainer {
  if (cached) return cached
  cached = createSeumeiContainer(createInMemoryStore())
  return cached
}
