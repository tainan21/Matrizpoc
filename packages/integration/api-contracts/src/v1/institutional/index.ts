/**
 * v1/institutional public contracts barrel.
 *
 * Camada INSTITUCIONAL dos contracts publicos (V1.2). Coexiste com a camada
 * tecnica pre-existente (V1.1) em src/v1/index.ts. Nenhum substitui o outro.
 *
 * Consumidores:
 *   import { ProjectManifest, ProjectManifestSchema }
 *     from "@matriz/integration-api-contracts/v1/institutional"
 *
 * Ver docs/control-plane-overview.md e docs/project-intelligence-contracts.md.
 */
export * from "./source-classification"
export * from "./project-brand-identity"
export * from "./project-health-snapshot"
export * from "./project-public-metrics"
export * from "./project-integration-capabilities"
export * from "./project-telemetry-summary"
export * from "./project-mcp-capabilities"
export * from "./project-manifest"

export const INSTITUTIONAL_CONTRACTS_VERSION = "v1" as const
