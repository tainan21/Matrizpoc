import type { ExternalProjectStatus } from "./types"
import { failedExternalStatus, unavailableExternalStatus } from "./types"

export interface ReadVercelProjectStatusInput {
  projectId: string
  teamId?: string
  token?: string
  now?: Date
  fetch?: typeof fetch
}

interface VercelDeploymentsResponse {
  deployments?: Array<{
    uid?: string
    state?: string
    url?: string
    created?: number
  }>
}

export async function readVercelProjectStatus(
  input: ReadVercelProjectStatusInput,
): Promise<ExternalProjectStatus> {
  const collectedAt = (input.now ?? new Date()).toISOString()
  if (!input.token) return unavailableExternalStatus("vercel", collectedAt)

  try {
    const query = new URLSearchParams({ projectId: input.projectId, limit: "1" })
    if (input.teamId) query.set("teamId", input.teamId)
    const response = await (input.fetch ?? fetch)(
      `https://api.vercel.com/v6/deployments?${query.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: { authorization: `Bearer ${input.token}` },
      },
    )
    if (!response.ok) throw new Error(`Vercel returned HTTP ${response.status}.`)
    const deployment = ((await response.json()) as VercelDeploymentsResponse).deployments?.[0]
    const status: ExternalProjectStatus["status"] = !deployment
      ? "unknown"
      : deployment.state === "READY"
        ? "passing"
        : deployment.state === "ERROR" || deployment.state === "CANCELED"
          ? "failing"
          : "pending"
    return {
      provider: "vercel",
      status,
      ...(deployment?.uid ? { externalId: deployment.uid } : {}),
      ...(deployment?.url ? { url: `https://${deployment.url}` } : {}),
      ...(deployment?.created ? { updatedAt: new Date(deployment.created).toISOString() } : {}),
      observation: {
        sourceId: "vercel:deployments",
        nature: "observed",
        observedAt: collectedAt,
        collectedAt,
        freshness: "fresh",
        confidence: "verified",
      },
    }
  } catch (error) {
    return failedExternalStatus("vercel", collectedAt, error)
  }
}
