/**
 * Spot DI container.
 *
 * Cria uma unica instancia por runtime (server/client) com repositorios
 * + use cases + gateways + adapters. Telas e rotas chamam
 * `getSpotContainer()` e consomem os use cases via interface (L5/L6).
 */
import { createInMemoryStore } from "@matriz/platform-storage"
import { createSpotRepositories } from "../mock/repositories"
import { createSpotUseCases, type SpotUseCases } from "../application/use-cases"
import { resolveContractsGateway, type ContractsGateway } from "../integration/gateways/contracts.gateway"

export interface SpotContainer {
  useCases: SpotUseCases
  gateways: { contracts: ContractsGateway }
}

let cachedContainer: SpotContainer | undefined

export function getSpotContainer(): SpotContainer {
  if (cachedContainer) return cachedContainer

  const store = createInMemoryStore()
  const repos = createSpotRepositories(store)
  const useCases = createSpotUseCases(repos)
  const contracts = resolveContractsGateway()

  cachedContainer = { useCases, gateways: { contracts } }
  return cachedContainer
}
