import type { ObservationMeta } from "@matriz/integration-api-contracts/v1/institutional"

export interface ExternalProjectStatus {
  provider: "github" | "vercel"
  status: "passing" | "failing" | "pending" | "unknown" | "not_configured"
  externalId?: string
  url?: string
  updatedAt?: string
  observation: ObservationMeta
}

export function unavailableExternalStatus(
  provider: ExternalProjectStatus["provider"],
  collectedAt: string,
): ExternalProjectStatus {
  return {
    provider,
    status: "not_configured",
    observation: {
      sourceId: provider,
      nature: "declared",
      collectedAt,
      freshness: "unknown",
      confidence: "unknown",
    },
  }
}

export function failedExternalStatus(
  provider: ExternalProjectStatus["provider"],
  collectedAt: string,
  error: unknown,
): ExternalProjectStatus {
  return {
    provider,
    status: "unknown",
    observation: {
      sourceId: provider,
      nature: "observed",
      observedAt: collectedAt,
      collectedAt,
      freshness: "unknown",
      confidence: "verified",
      lastError: {
        code: `${provider}_read_failed`,
        message: error instanceof Error ? error.message : String(error),
        occurredAt: collectedAt,
      },
    },
  }
}
