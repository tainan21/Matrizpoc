/**
 * SourceClassification (v1, institutional).
 *
 * Taxonomia institucional da origem de um projeto no ecossistema Matriz.
 * Domain-free (L12): nao menciona gig/establishment/contract/goal.
 *
 * Ver docs/source-classification.md para a matriz trust x sourceType.
 */
import { z } from "zod"

export const SOURCE_CLASSIFICATION_VALUES = [
  "internal_monorepo_app",
  "trusted_external_app",
  "legacy_app",
  "third_party_service",
  "mcp_source",
  "institutional_source",
] as const

export const sourceClassificationSchema = z.enum(SOURCE_CLASSIFICATION_VALUES)
export type SourceClassification = z.infer<typeof sourceClassificationSchema>

export const TRUST_LEVEL_VALUES = [
  "core",
  "trusted",
  "external",
  "experimental",
  "unknown",
] as const

export const trustLevelSchema = z.enum(TRUST_LEVEL_VALUES)
export type TrustLevel = z.infer<typeof trustLevelSchema>

export const INGESTION_MODE_VALUES = [
  "static_seed",
  "local_contract_import",
  "snapshot_pull",
  "api_pull",
  "webhook_push",
  "manual_registration",
] as const

export const ingestionModeSchema = z.enum(INGESTION_MODE_VALUES)
export type IngestionMode = z.infer<typeof ingestionModeSchema>

/**
 * Matriz oficial de combinacoes permitidas sourceType x ingestMode.
 * Espelha a tabela em docs/source-classification.md e docs/ingestion-model.md.
 */
export const ALLOWED_INGEST_MODES_BY_SOURCE: Record<SourceClassification, readonly IngestionMode[]> = {
  internal_monorepo_app: ["local_contract_import", "static_seed"],
  trusted_external_app: ["api_pull", "webhook_push", "snapshot_pull"],
  legacy_app: ["snapshot_pull", "static_seed", "manual_registration"],
  third_party_service: ["static_seed", "manual_registration"],
  mcp_source: ["api_pull", "snapshot_pull", "manual_registration"],
  institutional_source: ["snapshot_pull", "api_pull"],
}

/**
 * Trust padrao por sourceType. Usado como default / baseline em validators.
 */
export const DEFAULT_TRUST_BY_SOURCE: Record<SourceClassification, TrustLevel> = {
  internal_monorepo_app: "core",
  trusted_external_app: "trusted",
  legacy_app: "external",
  third_party_service: "external",
  mcp_source: "experimental",
  institutional_source: "trusted",
}

export function isIngestModeAllowed(
  sourceType: SourceClassification,
  mode: IngestionMode,
): boolean {
  return ALLOWED_INGEST_MODES_BY_SOURCE[sourceType].includes(mode)
}
