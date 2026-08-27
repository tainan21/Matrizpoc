import type { TerminalSession } from "../../domain/types"

export interface TerminalState {
  readonly sessions: readonly TerminalSession[]
  readonly activeId?: string
  readonly lastSequences: Readonly<Record<string, number>>
  readonly dockOpen: boolean
  readonly canCreate: boolean
}

export type TerminalAction =
  | { readonly type: "reconcile"; readonly sessions: readonly TerminalSession[] }
  | { readonly type: "upsert"; readonly session: TerminalSession }
  | { readonly type: "remove"; readonly sessionId: string }
  | { readonly type: "activate"; readonly sessionId: string }
  | { readonly type: "chunk"; readonly sessionId: string; readonly sequence: number }
  | { readonly type: "dock"; readonly open: boolean }

const withDerived = (state: Omit<TerminalState, "canCreate">): TerminalState => ({
  ...state,
  canCreate: state.sessions.length < 6,
})

export function createTerminalState(sessions: readonly TerminalSession[] = []): TerminalState {
  return withDerived({
    sessions,
    activeId: sessions[0]?.id,
    lastSequences: {},
    dockOpen: false,
  })
}

export function terminalReducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case "reconcile":
      return withDerived({
        ...state,
        sessions: action.sessions,
        activeId: action.sessions.some(({ id }) => id === state.activeId)
          ? state.activeId
          : action.sessions[0]?.id,
      })
    case "upsert": {
      const exists = state.sessions.some(({ id }) => id === action.session.id)
      const sessions = exists
        ? state.sessions.map((item) => (item.id === action.session.id ? action.session : item))
        : [...state.sessions, action.session]
      return withDerived({ ...state, sessions, activeId: state.activeId ?? action.session.id })
    }
    case "remove": {
      const sessions = state.sessions.filter(({ id }) => id !== action.sessionId)
      return withDerived({
        ...state,
        sessions,
        activeId: state.activeId === action.sessionId ? sessions[0]?.id : state.activeId,
      })
    }
    case "activate":
      return state.sessions.some(({ id }) => id === action.sessionId)
        ? { ...state, activeId: action.sessionId }
        : state
    case "chunk":
      return action.sequence > (state.lastSequences[action.sessionId] ?? 0)
        ? {
            ...state,
            lastSequences: { ...state.lastSequences, [action.sessionId]: action.sequence },
          }
        : state
    case "dock":
      return { ...state, dockOpen: action.open }
  }
}
