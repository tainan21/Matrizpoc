import { expect, it } from "vitest"
import type {
  DeliveryReceipt,
  PreviewReceipt,
  PullRequestReceipt,
} from "../../domain/delivery"
import type { CodexRunRecord } from "../../domain/codex-run"
import type { AgentRequest } from "../../domain/schemas"
import { toDeliveryEvidenceViewModel } from "./delivery-evidence-presenter"

const timestamp = "2026-07-28T20:00:00.000Z"
const request: AgentRequest = {
  schemaVersion: 1,
  id: "req_11111111-1111-4111-8111-111111111111",
  projectId: "sample",
  backlogItemId: "tsk_22222222-2222-4222-8222-222222222222",
  title: "Validar entrega",
  instructions: "",
  status: "completed",
  claimedBy: "codex",
  resultSummary: "Entrega validada.",
  changedFiles: ["src/a.ts"],
  checks: ["pnpm test"],
  createdAt: timestamp,
  updatedAt: timestamp,
  revision: "revision-1",
}

it("joins agent, run and external receipt without duplicating evidence", () => {
  const run: CodexRunRecord = {
    schemaVersion: 1,
    projectId: "sample",
    requestId: request.id,
    backlogItemId: request.backlogItemId,
    status: "completed",
    threadId: "thread-1",
    latestMessage: "Pronto.",
    plan: [],
    commands: [],
    changedFiles: ["src/a.ts", "src/b.ts"],
    checks: ["pnpm test"],
    approvals: [],
    diff: "",
    startedAt: timestamp,
    updatedAt: timestamp,
    completedAt: timestamp,
    revision: "revision-2",
  }
  const receipt: DeliveryReceipt = {
    schemaVersion: 1,
    projectId: "sample",
    backlogItemId: request.backlogItemId,
    provider: "github",
    kind: "issue",
    idempotencyKey: "sample:key",
    externalId: "42",
    url: "https://github.com/matriz/sample/issues/42",
    publishedAt: timestamp,
    recordedAt: timestamp,
    revision: "revision-3",
  }
  const pullRequest: PullRequestReceipt = {
    schemaVersion: 1,
    projectId: "sample",
    backlogItemId: request.backlogItemId,
    agentRequestId: request.id,
    provider: "github",
    kind: "pull_request",
    idempotencyKey: "sample:pr:42",
    externalId: "42",
    url: "https://github.com/matriz/sample/pull/42",
    baseBranch: "main",
    headBranch: "feat/delivery",
    headCommit: "a".repeat(40),
    checks: ["pnpm test"],
    publishedAt: timestamp,
    recordedAt: timestamp,
    revision: "revision-4",
  }
  const preview: PreviewReceipt = {
    schemaVersion: 1,
    projectId: "sample",
    backlogItemId: request.backlogItemId,
    agentRequestId: request.id,
    provider: "vercel",
    kind: "preview",
    idempotencyKey: "sample:preview:dpl_42",
    deploymentId: "dpl_42",
    url: "https://matriz-sample-feature.vercel.app",
    environment: "preview",
    sourceCommit: pullRequest.headCommit,
    state: "ready",
    recordedAt: timestamp,
    revision: "revision-5",
  }

  const result = toDeliveryEvidenceViewModel(
    [request],
    [run],
    receipt,
    [pullRequest],
    [preview],
  )

  expect(result.runs[0].changedFiles).toEqual(["src/a.ts", "src/b.ts"])
  expect(result.runs[0].checks).toEqual(["pnpm test"])
  expect(result.runs[0].threadId).toBe("thread-1")
  expect(result.issue?.number).toBe("42")
  expect(result.hasSuccessfulChecks).toBe(true)
  expect(result.hasPullRequest).toBe(true)
  expect(result.hasReadyPreview).toBe(true)
  expect(result.runs[0].pullRequest?.number).toBe("42")
  expect(result.runs[0].preview?.deploymentId).toBe("dpl_42")
})
