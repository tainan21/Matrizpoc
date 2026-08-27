/**
 * v1 public contracts barrel.
 *
 * L7: tudo que vive aqui e "v1". Uma eventual v2 conviveria ao lado em
 * packages/integration/api-contracts/src/v2 sem quebrar consumidores.
 */
export * from "./manifest"
export * from "./external-link"
export * from "./telemetry"
export * from "./summaries"
export * from "./contract-inputs"
export * from "./onboarding"
export * from "./docs"
export * from "./capabilities"
export * from "./seumei-portfolio"
export * from "./host-health"
export * from "./store-package"

export const API_CONTRACTS_DEFAULT_VERSION = "v1" as const
export type ApiContractsVersion = typeof API_CONTRACTS_DEFAULT_VERSION
