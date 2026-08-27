import { describe, expect, it } from "vitest"

import type { TerminalSession } from "../../domain/types"
import { createTerminalState, terminalReducer } from "./terminal-store"

const session = (id: string, status: TerminalSession["status"] = "running"): TerminalSession => ({
  id,
  title: `Shell ${id}`,
  kind: "shell",
  status,
  cwd: "C:\\Apps\\matriz-infra-hub",
  tail: "",
})

describe("terminal state", () => {
  it("rejects stale output sequences", () => {
    let state = terminalReducer(createTerminalState(), { type: "upsert", session: session("a") })
    state = terminalReducer(state, { type: "chunk", sessionId: "a", sequence: 4 })
    state = terminalReducer(state, { type: "chunk", sessionId: "a", sequence: 3 })
    expect(state.lastSequences.a).toBe(4)
  })

  it("selects a remaining tab when the active session closes", () => {
    let state = createTerminalState([session("a"), session("b")])
    state = terminalReducer(state, { type: "activate", sessionId: "b" })
    state = terminalReducer(state, { type: "remove", sessionId: "b" })
    expect(state.activeId).toBe("a")
  })

  it("keeps terminal status while the dock is collapsed", () => {
    let state = createTerminalState([session("build", "starting")])
    state = terminalReducer(state, { type: "dock", open: false })
    state = terminalReducer(state, { type: "upsert", session: session("build", "failed") })
    expect(state.sessions[0]?.status).toBe("failed")
    expect(state.dockOpen).toBe(false)
  })

  it("allows no more than six visible sessions", () => {
    const state = createTerminalState(Array.from({ length: 6 }, (_, index) => session(`${index}`)))
    expect(state.canCreate).toBe(false)
  })
})
