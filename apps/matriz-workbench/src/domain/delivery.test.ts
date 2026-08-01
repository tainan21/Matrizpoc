import { describe, expect, it } from "vitest"
import {
  deliveryArtifactReceiptSchema,
  previewReceiptSchema,
  pullRequestReceiptSchema,
} from "./delivery"

const shared = {
  schemaVersion: 1 as const,
  projectId: "matriz-workbench",
  backlogItemId: "tsk_11111111-1111-4111-8111-111111111111",
  agentRequestId: "req_22222222-2222-4222-8222-222222222222",
  recordedAt: "2026-07-28T20:00:00.000Z",
  revision: "revision-1",
}

describe("delivery artifact contracts", () => {
  it("requires immutable commit evidence for a pull request", () => {
    const result = pullRequestReceiptSchema.safeParse({
      ...shared,
      provider: "github",
      kind: "pull_request",
      idempotencyKey: "matriz-workbench:req:commit:pull-request",
      externalId: "42",
      url: "https://github.com/matriz/repo/pull/42",
      baseBranch: "main",
      headBranch: "feat/workbench",
      headCommit: "a".repeat(40),
      checks: ["pnpm test"],
      publishedAt: "2026-07-28T20:00:00.000Z",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a preview without a commit or terminally known state", () => {
    expect(previewReceiptSchema.safeParse({
      ...shared,
      provider: "vercel",
      kind: "preview",
      idempotencyKey: "matriz-workbench:req:dpl_123",
      deploymentId: "dpl_123",
      url: "https://example.vercel.app",
      environment: "preview",
      sourceCommit: "short",
      state: "unknown",
    }).success).toBe(false)
  })

  it("keeps provider and artifact kind coupled", () => {
    expect(deliveryArtifactReceiptSchema.safeParse({
      ...shared,
      provider: "vercel",
      kind: "pull_request",
    }).success).toBe(false)
  })
})
