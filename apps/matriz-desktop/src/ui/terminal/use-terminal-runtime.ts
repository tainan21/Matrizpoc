import { useCallback, useEffect, useReducer, useRef } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { TerminalSession } from "../../domain/types"
import type { ManagedOperationId } from "../../domain/types"
import { createTerminalState, terminalReducer } from "./terminal-store"

type OutputSink = (data: string) => void

export function useTerminalRuntime(
  gateway: DesktopGateway,
  onDockOpenChange?: (open: boolean) => void,
) {
  const [state, dispatch] = useReducer(terminalReducer, undefined, () => createTerminalState())
  const sinks = useRef(new Map<string, OutputSink>())
  const sequences = useRef(new Map<string, number>())
  const closedSessions = useRef(new Set<string>())
  const dockOpenChange = useRef(onDockOpenChange)
  dockOpenChange.current = onDockOpenChange

  const setDockOpen = useCallback((open: boolean) => {
    dispatch({ type: "dock", open })
    dockOpenChange.current?.(open)
  }, [])

  const restoreDockOpen = useCallback((open: boolean) => {
    dispatch({ type: "dock", open })
  }, [])

  useEffect(() => {
    let active = true
    void gateway.listTerminals().then((sessions) => {
      if (active) dispatch({ type: "reconcile", sessions })
    })
    void gateway.subscribeTerminal((event) => {
      if (!active) return
      if (event.event === "closed") {
        closedSessions.current.add(event.data.sessionId)
        sinks.current.delete(event.data.sessionId)
        sequences.current.delete(event.data.sessionId)
        dispatch({ type: "remove", sessionId: event.data.sessionId })
        return
      }
      if (event.event === "state") {
        if (closedSessions.current.has(event.data.id)) return
        dispatch({ type: "upsert", session: event.data })
        return
      }
      if (closedSessions.current.has(event.data.sessionId)) return
      const previous = sequences.current.get(event.data.sessionId) ?? 0
      if (event.data.sequence <= previous) return
      sequences.current.set(event.data.sessionId, event.data.sequence)
      sinks.current.get(event.data.sessionId)?.(event.data.data)
      dispatch({
        type: "chunk",
        sessionId: event.data.sessionId,
        sequence: event.data.sequence,
      })
    })
    return () => {
      active = false
    }
  }, [gateway])

  const create = useCallback(async () => {
    const session = await gateway.createTerminal()
    dispatch({ type: "upsert", session })
    dispatch({ type: "activate", sessionId: session.id })
    setDockOpen(true)
  }, [gateway, setDockOpen])

  const close = useCallback(
    async (sessionId: string) => {
      closedSessions.current.add(sessionId)
      try {
        await gateway.closeTerminal(sessionId)
      } catch (error) {
        closedSessions.current.delete(sessionId)
        throw error
      }
      sinks.current.delete(sessionId)
      sequences.current.delete(sessionId)
      dispatch({ type: "remove", sessionId })
    },
    [gateway],
  )

  const startOperation = useCallback(
    async (operationId: ManagedOperationId) => {
      const session = await gateway.startManagedOperation(operationId)
      dispatch({ type: "upsert", session })
      dispatch({ type: "activate", sessionId: session.id })
      setDockOpen(true)
      return session
    },
    [gateway, setDockOpen],
  )

  const register = useCallback((session: TerminalSession, sink: OutputSink) => {
    sinks.current.set(session.id, sink)
    if (session.tail) sink(session.tail)
    return () => {
      if (sinks.current.get(session.id) === sink) sinks.current.delete(session.id)
    }
  }, [])

  return {
    state,
    create,
    close,
    startOperation,
    activate: (sessionId: string) => dispatch({ type: "activate", sessionId }),
    interrupt: (sessionId: string) => gateway.interruptTerminal(sessionId),
    setDockOpen,
    restoreDockOpen,
    register,
  }
}
