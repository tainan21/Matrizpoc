/**
 * ProjectManifest (v1, institutional).
 *
 * Manifest institucional de QUALQUER projeto do ecossistema Matriz:
 * app interno, legado, terceiro, fonte MCP ou registry institucional.
 *
 * Coexiste com AppManifestDTO (tecnico, V1.1). Nao substitui.
 * Ver docs/project-intelligence-contracts.md e docs/control-plane-overview.md.
 *
 * L12: domain-free. Nenhum termo de dominio forte de app.
 * L7: versionado em v1/institutional.
 */
import { z } from "zod"
import { CONTRACT_VERSION_V1 } from "@matriz/foundation-constants"
import {
  ALLOWED_INGEST_MODES_BY_SOURCE,
  DEFAULT_TRUST_BY_SOURCE,
  ingestionModeSchema,
  sourceClassificationSchema,
  trustLevelSchema,
  type IngestionMode,
  type SourceClassification,
  type TrustLevel,
} from "./source-classification"
import {
  projectBrandIdentitySchema,
  type ProjectBrandIdentity,
} from "./project-brand-identity"
import {
  projectHealthSnapshotSchema,
  type ProjectHealthSnapshot,
} from "./project-health-snapshot"
import {
  projectPublicMetricsSchema,
  type ProjectPublicMetrics,
} from "./project-public-metrics"
import {
  projectIntegrationCapabilitiesSchema,
  type ProjectIntegrationCapabilities,
} from "./project-integration-capabilities"
import {
  projectTelemetrySummarySchema,
  type ProjectTelemetrySummary,
} from "./project-telemetry-summary"
import {
  projectMcpCapabilitiesSchema,
  type ProjectMcpCapabilities,
} from "./project-mcp-capabilities"

/**
 * ProjectId: string com padrao {prefix}:{slug}.
 * Exemplos: matriz:spot, ventures:north-star-labs, legacy:booking-crm.
 *
 * Nao usamos `z.string().brand()` aqui pois seria overkill para a superficie
 * institucional; usamos um refine pattern e tipo nominal leve.
 */
const projectIdPattern = /^[a-z][a-z0-9]*:[a-z0-9][a-z0-9-]*$/
export const projectIdSchema = z
  .string()
  .regex(
    projectIdPattern,
    "ProjectId must match {prefix}:{slug}, e.g. matriz:spot",
  )
export type ProjectId = z.infer<typeof projectIdSchema>

export const projectLinkSchema = z.object({
  kind: z.enum(["docs", "site", "app", "repo", "status"]),
  url: z.string().url(),
  label: z.string().optional(),
})
export type ProjectLink = z.infer<typeof projectLinkSchema>

export const projectOwnershipSchema = z.object({
  owner: z.string().min(1),
  contact: z.string().optional(),
  repo: z.string().optional(),
})
export type ProjectOwnership = z.infer<typeof projectOwnershipSchema>

/**
 * Validator cruzado: `ingestMode` precisa pertencer aos modos permitidos
 * pelo `sourceType`. Evita registrar um `internal_monorepo_app` via
 * `webhook_push`, por exemplo.
 */
export const projectManifestSchema = z
  .object({
    projectId: projectIdSchema,
    displayName: z.string().min(1),
    sourceType: sourceClassificationSchema,
    trustLevel: trustLevelSchema,
    ingestMode: ingestionModeSchema,
    contractVersion: z.literal(CONTRACT_VERSION_V1),
    brand: projectBrandIdentitySchema,
    capabilities: projectIntegrationCapabilitiesSchema,
    health: projectHealthSnapshotSchema,
    metrics: projectPublicMetricsSchema.optional(),
    telemetry: projectTelemetrySummarySchema.optional(),
    mcp: projectMcpCapabilitiesSchema.optional(),
    institutionalTags: z.array(z.string().min(1)).default([]),
    ownership: projectOwnershipSchema,
    links: z.array(projectLinkSchema).default([]),
    ingestedAt: z.string().datetime(),
  })
  .superRefine((v, ctx) => {
    const allowed = ALLOWED_INGEST_MODES_BY_SOURCE[v.sourceType]
    if (!allowed.includes(v.ingestMode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ingestMode"],
        message: `ingestMode "${v.ingestMode}" not allowed for sourceType "${v.sourceType}". Allowed: ${allowed.join(", ")}`,
      })
    }
  })
export type ProjectManifest = z.infer<typeof projectManifestSchema>

/**
 * Helper que diz se um `trustLevel` e coerente com o `sourceType`.
 * Retorna `"ok"`, `"warn"` ou `"fail"`, para uso em auditoria sem bloquear
 * ingestao legitima de casos mais raros.
 *
 * Regra atual:
 *   - igual ao trust padrao -> ok
 *   - dentro da coluna "outros aceitos" -> warn
 *   - fora de ambas -> fail
 */
export function evaluateTrustCoherence(
  sourceType: SourceClassification,
  trustLevel: TrustLevel,
): "ok" | "warn" | "fail" {
  if (trustLevel === DEFAULT_TRUST_BY_SOURCE[sourceType]) return "ok"
  const otherAccepted: Record<SourceClassification, readonly TrustLevel[]> = {
    internal_monorepo_app: ["experimental"],
    trusted_external_app: ["core"],
    legacy_app: ["experimental"],
    third_party_service: ["unknown"],
    mcp_source: ["trusted", "external"],
    institutional_source: ["core"],
  }
  return otherAccepted[sourceType].includes(trustLevel) ? "warn" : "fail"
}

export type { IngestionMode, SourceClassification, TrustLevel }
export type {
  ProjectBrandIdentity,
  ProjectHealthSnapshot,
  ProjectPublicMetrics,
  ProjectIntegrationCapabilities,
  ProjectTelemetrySummary,
  ProjectMcpCapabilities,
}
