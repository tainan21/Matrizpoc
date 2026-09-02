import "@testing-library/jest-dom/vitest"

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import { GitView } from "./git-view"

describe("GitView", () => {
  it("uses opaque ids and the observed revision for daily actions", async () => {
    const snapshot = {
      revision: "rev-1",
      branch: "main",
      ahead: 0,
      behind: 0,
      changes: [{ id: "change-a", path: "src/app.ts", indexStatus: " ", worktreeStatus: "M", staged: false, hasWorktreeChanges: true }],
      recent: [],
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
})
