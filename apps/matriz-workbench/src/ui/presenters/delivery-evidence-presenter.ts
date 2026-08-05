import type {
  DeliveryReceipt,
  PreviewReceipt,
  PullRequestReceipt,
} from "../../domain/delivery"
import type { CodexRunRecord } from "../../domain/codex-run"
import type { AgentRequest } from "../../domain/schemas"

export interface DeliveryRunEvidenceViewModel {
  requestId: string
  title: string
  requestStatus: AgentRequest["status"]
  claimedBy?: string
  resultSummary?: string
  threadId?: string
  runStatus?: CodexRunRecord["status"]
  changedFiles: string[]
  checks: string[]
  updatedAt: string
  pullRequest?: {
    number: string
    url: string
    headCommit: string
  }
  preview?: {
    deploymentId: string
    url: string
    state: PreviewReceipt["state"]
    environment: PreviewReceipt["environment"]
    sourceCommit: string
  }
}

export interface DeliveryEvidenceViewModel {
  runs: DeliveryRunEvidenceViewModel[]
  issue?: {
    number: string
    url: string
    recordedAt: string
  }
  hasSuccessfulChecks: boolean
  hasChangedFiles: boolean
  hasPullRequest: boolean
  hasReadyPreview: boolean
}

export function toDeliveryEvidenceViewModel(
  requests: AgentRequest[],
  runs: Array<CodexRunRecord | undefined>,
  receipt?: DeliveryReceipt,
  pullRequests: Array<PullRequestReceipt | undefined> = [],
  previews: Array<PreviewReceipt | undefined> = [],
): DeliveryEvidenceViewModel {
  const runByRequest = new Map(
    runs.filter((run): run is CodexRunRecord => Boolean(run)).map((run) => [run.requestId, run]),
  )
  const pullRequestByRequest = new Map(
    pullRequests
      .filter((item): item is PullRequestReceipt => Boolean(item))
      .map((item) => [item.agentRequestId, item]),
  )
  const previewByRequest = new Map(
    previews
      .filter((item): item is PreviewReceipt => Boolean(item))
      .map((item) => [item.agentRequestId, item]),
  )
  const evidenceRuns = requests
    .map((request) => {
      const run = runByRequest.get(request.id)
      const pullRequest = pullRequestByRequest.get(request.id)
      const preview = previewByRequest.get(request.id)
      return {
        requestId: request.id,
        title: request.title,
        requestStatus: request.status,
        claimedBy: request.claimedBy,
        resultSummary: request.resultSummary,
        threadId: run?.threadId,
        runStatus: run?.status,
        changedFiles: Array.from(new Set([...request.changedFiles, ...(run?.changedFiles ?? [])])),
        checks: Array.from(new Set([...request.checks, ...(run?.checks ?? [])])),
        updatedAt: run?.updatedAt ?? request.updatedAt,
        pullRequest: pullRequest
          ? {
              number: pullRequest.externalId,
              url: pullRequest.url,
              headCommit: pullRequest.headCommit,
            }
          : undefined,
        preview: preview
          ? {
              deploymentId: preview.deploymentId,
              url: preview.url,
              state: preview.state,
              environment: preview.environment,
              sourceCommit: preview.sourceCommit,
            }
          : undefined,
      }
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))

  return {
    runs: evidenceRuns,
    issue: receipt
      ? {
          number: receipt.externalId,
          url: receipt.url,
          recordedAt: receipt.recordedAt,
        }
      : undefined,
    hasSuccessfulChecks: evidenceRuns.some((run) => run.checks.length > 0),
    hasChangedFiles: evidenceRuns.some((run) => run.changedFiles.length > 0),
    hasPullRequest: evidenceRuns.some((run) => Boolean(run.pullRequest)),
    hasReadyPreview: evidenceRuns.some((run) => run.preview?.state === "ready"),
  }
}
