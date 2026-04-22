import {
  createInMemoryContractRepository,
  createInMemoryContractTemplateRepository,
  createInMemoryCounterpartyRepository,
} from "../mock/repositories"
import { createContractsUseCases, type ContractsUseCases } from "../application/use-cases"

let instance: ContractsUseCases | null = null

export function getContractsContainer(): ContractsUseCases {
  if (instance) return instance
  instance = createContractsUseCases({
    contracts: createInMemoryContractRepository(),
    templates: createInMemoryContractTemplateRepository(),
    counterparties: createInMemoryCounterpartyRepository(),
  })
  return instance
}

export function __resetContractsContainer(): void {
  instance = null
}
