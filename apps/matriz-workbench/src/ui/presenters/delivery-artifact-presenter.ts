import type { PreviewReceipt, PullRequestReceipt } from "../../domain/delivery"

export interface PullRequestReceiptViewModel {
  number: string
  url: string
  baseBranch: string
  headBranch: string
  headCommit: string
  checks: string[]
  recordedAt: string
  revision: string
}

export interface PreviewReceiptViewModel {
  deploymentId: string
  url: string
  environment: PreviewReceipt["environment"]
  sourceCommit: string
  state: PreviewReceipt["state"]
  recordedAt: string
  revision: string
}

export function toPullRequestReceiptViewModel(
  receipt?: PullRequestReceipt,
): PullRequestReceiptViewModel | undefined {
  if (!receipt) return undefined
  return {
    number: receipt.externalId,
    url: receipt.url,
    baseBranch: receipt.baseBranch,
    headBranch: receipt.headBranch,
    headCommit: receipt.headCommit,
    checks: receipt.checks,
    recordedAt: receipt.recordedAt,
    revision: receipt.revision,
  }
}

export function toPreviewReceiptViewModel(
  receipt?: PreviewReceipt,
): PreviewReceiptViewModel | undefined {
  if (!receipt) return undefined
  return {
    deploymentId: receipt.deploymentId,
    url: receipt.url,
    environment: receipt.environment,
    sourceCommit: receipt.sourceCommit,
    state: receipt.state,
    recordedAt: receipt.recordedAt,
    revision: receipt.revision,
  }
}
