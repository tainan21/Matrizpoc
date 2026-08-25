import type { ExternalProjectStatus } from "./types"
import { failedExternalStatus, unavailableExternalStatus } from "./types"

export interface ReadGitHubProjectStatusInput {
  repository: string
  token?: string
  now?: Date
  fetch?: typeof fetch
}

interface GitHubRunsResponse {
  workflow_runs?: Array<{
    id?: number
    status?: string
    conclusion?: string | null
    html_url?: string
    updated_at?: string
  }>
}

export async function readGitHubProjectStatus(
  input: ReadGitHubProjectStatusInput,
): Promise<ExternalProjectStatus> {
  const collectedAt = (input.now ?? new Date()).toISOString()
  if (!input.token) return unavailableExternalStatus("github", collectedAt)
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input.repository)) {
    return failedExternalStatus("github", collectedAt, new Error("Invalid GitHub repository."))
  }

  try {
    const response = await (input.fetch ?? fetch)(
      `https://api.github.com/repos/${input.repository}/actions/runs?per_page=1`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${input.token}`,
          "x-github-api-version": "2022-11-28",
        },
      },
    )
    if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}.`)
    const run = ((await response.json()) as GitHubRunsResponse).workflow_runs?.[0]
    const status: ExternalProjectStatus["status"] = !run
      ? "unknown"
      : run.status !== "completed"
        ? "pending"
        : run.conclusion === "success"
          ? "passing"
          : "failing"
    return {
      provider: "github",
      status,
      ...(run?.id !== undefined ? { externalId: String(run.id) } : {}),
      ...(run?.html_url ? { url: run.html_url } : {}),
      ...(run?.updated_at ? { updatedAt: run.updated_at } : {}),
      observation: {
        sourceId: "github:actions",
        nature: "observed",
        observedAt: collectedAt,
        collectedAt,
        freshness: "fresh",
        confidence: "verified",
      },
    }
  } catch (error) {
    return failedExternalStatus("github", collectedAt, error)
  }
}
