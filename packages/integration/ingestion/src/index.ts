/**
 * @matriz/integration-ingestion
 *
 * Pipeline institucional de ingestao. V1.2.
 *
 * Adapters funcionais:
 *   - StaticSeedAdapter
 *   - LocalContractImportAdapter
 *   - SnapshotPullAdapter
 *
 * Scaffolds (NotImplementedIngestionError):
 *   - createApiPullAdapter
 *   - createWebhookPushAdapter
 *   - createManualRegistrationAdapter
 */
export * from "./types"
export * from "./pipeline"
export * from "./adapters/static-seed"
export * from "./adapters/local-contract-import"
export * from "./adapters/snapshot-pull"
export * from "./adapters/scaffolds"

export const INTEGRATION_INGESTION_VERSION = "1.0.0" as const
