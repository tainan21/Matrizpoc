import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import { GitView } from "./git-view"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("GitView", () => {
  it("uses opaque ids and the observed revision for daily actions", async () => {
    const snapshot = {
      revision: "rev-1",
      branch: "main",
      ahead: 0,
      behind: 0,
      changes: [{ id: "change-a", path: "src/app.ts", indexStatus: " ", worktreeStatus: "M", staged: false, hasWorktreeChanges: true }],
      recent: [],
      branches: [{ name: "main", current: true, upstream: "origin/main" }],
      reflog: [{ shortId: "abc1234", subject: "commit: initial", occurredAt: 1 }],
    }
    const gateway = {
      gitSnapshot: vi.fn().mockResolvedValue(snapshot),
      gitDiff: vi.fn().mockResolvedValue({ changeId: "change-a", staged: false, lines: ["+safe change"], truncated: false }),
      gitStage: vi.fn().mockResolvedValue({ ...snapshot, changes: [{ ...snapshot.changes[0], staged: true }] }),
    } as unknown as DesktopGateway
    render(<GitView gateway={gateway} />)

    fireEvent.click(await screen.findByRole("button", { name: "Ver diff de src/app.ts" }))
    expect(await screen.findByText("+safe change")).toBeVisible()
    expect(gateway.gitDiff).toHaveBeenCalledWith({ revision: "rev-1", changeId: "change-a" })

    fireEvent.click(screen.getByRole("checkbox", { name: "Selecionar src/app.ts" }))
    fireEvent.click(screen.getByRole("button", { name: "STAGE" }))
    await waitFor(() => expect(gateway.gitStage).toHaveBeenCalledWith({ revision: "rev-1", changeIds: ["change-a"] }))
  })

  it("requires explicit confirmation before a fixed remote action", async () => {
    const snapshot = {
      revision: "rev-remote",
      branch: "main",
      upstream: "origin/main",
      ahead: 1,
      behind: 0,
      changes: [],
      recent: [],
      branches: [{ name: "main", current: true, upstream: "origin/main" }],
      reflog: [],
    }
    const gateway = {
      gitSnapshot: vi.fn().mockResolvedValue(snapshot),
      gitRemote: vi.fn().mockResolvedValue({ ...snapshot, ahead: 0 }),
    } as unknown as DesktopGateway
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)
    render(<GitView gateway={gateway} />)

    fireEvent.click(await screen.findByRole("button", { name: "Enviar commits" }))
    await waitFor(() => expect(gateway.gitRemote).toHaveBeenCalledWith({ revision: "rev-remote", action: "push" }))
    expect(confirm).toHaveBeenCalled()
  })

  it("creates and switches local branches using the observed revision", async () => {
    const snapshot = { revision: "rev-branch", branch: "main", ahead: 0, behind: 0, changes: [], recent: [], branches: [{ name: "main", current: true }], reflog: [] }
    const gateway = {
      gitSnapshot: vi.fn().mockResolvedValue(snapshot),
      gitBranch: vi.fn().mockResolvedValue({ ...snapshot, revision: "rev-next", branch: "feature/safe", branches: [{ name: "feature/safe", current: true }] }),
    } as unknown as DesktopGateway
    render(<GitView gateway={gateway} />)

    fireEvent.change(await screen.findByRole("textbox", { name: "Nova branch local" }), { target: { value: "feature/safe" } })
    fireEvent.click(screen.getByRole("button", { name: "Criar branch" }))
    await waitFor(() => expect(gateway.gitBranch).toHaveBeenCalledWith({ revision: "rev-branch", action: "create", name: "feature/safe" }))
  })

  it("previews a local merge before using its one-time confirmation", async () => {
    const snapshot = { revision: "rev-merge", branch: "main", ahead: 0, behind: 0, changes: [], recent: [], branches: [{ name: "main", current: true }, { name: "feature", current: false }], reflog: [] }
    const gateway = {
      gitSnapshot: vi.fn().mockResolvedValue(snapshot),
      previewGitMerge: vi.fn().mockResolvedValue({ target: "feature", commits: 2, changedFiles: 3, confirmationToken: "merge-token", expiresAt: Date.now() + 30_000 }),
      confirmGitMerge: vi.fn().mockResolvedValue({ ...snapshot, revision: "rev-after" }),
    } as unknown as DesktopGateway
    render(<GitView gateway={gateway} />)
    fireEvent.click(await screen.findByRole("button", { name: "Preparar merge de feature" }))
    expect(await screen.findByText("2 commits · 3 arquivos alterados")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Confirmar merge" }))
    await waitFor(() => expect(gateway.confirmGitMerge).toHaveBeenCalledWith("merge-token"))
  })
})
