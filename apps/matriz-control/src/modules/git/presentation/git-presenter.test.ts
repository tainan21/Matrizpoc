import { describe, expect, it } from "vitest"
import { presentGitOverview } from "./git-presenter"

describe("presentGitOverview", () => {
  it("prioritizes divergence and working tree attention", () => {
    const view = presentGitOverview({
      repositoryId: "mih",
      revision: "abc",
      sampledAt: "2026-08-27T10:00:00.000Z",
      branch: "main",
      upstream: "origin/main",
      ahead: 2,
      behind: 1,
      head: { id: "abcdef123", shortId: "abcdef1", subject: "feat: control" },
      changes: [{ path: "src/a.ts", staged: "modified", unstaged: null }],
      counts: { staged: 1, unstaged: 0, untracked: 0, conflicted: 0 },
    })
    expect(view.status).toBe("Divergente")
    expect(view.attention).toBe("high")
    expect(view.changeTotal).toBe(1)
  })
})
