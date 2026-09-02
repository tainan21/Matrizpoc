import { useCallback, useEffect, useReducer, useRef, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { TerminalReadiness, TerminalSession } from "../../domain/types"
import type { ManagedOperationId } from "../../domain/types"
import { createTerminalState, terminalReducer } from "./terminal-store"

type OutputSink = (data: string) => void

export function useTerminalRuntime(
  gateway: DesktopGateway,
  onDockOpenChange?: (open: boolean) => void,
) {
  const [state, dispatch] = useReducer(terminalReducer, undefined, () => createTerminalState())
  const [readiness, setReadiness] = useState<TerminalReadiness>()
  const [error, setError] = useState<string>()
  const sinks = useRef(new Map<string, OutputSink>())
  const sequences = useRef(new Map<string, number>())
  const closedSessions = useRef(new Set<string>())
  const dockOpenChange = useRef(onDockOpenChange)
  dockOpenChange.current = onDockOpenChange

  const reportError = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : String(cause))
  }, [])

  const setDockOpen = useCallback((open: boolean) => {
    dispatch({ type: "dock", open })
    dockOpenChange.current?.(open)
  }, [])

  const restoreDockOpen = useCallback((open: boolean) => {
    dispatch({ type: "dock", open })
  }, [])

  const refreshReadiness = useCallback(async () => {
    try {
      const next = await gateway.terminalReadiness()
      setReadiness(next)
      if (next.ready) setError(undefined)
      return next
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      setError(message)
      throw cause
    }
  }, [gateway])

  useEffect(() => {
    let active = true
    void refreshReadiness().catch(() => undefined)
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
  }, [gateway, refreshReadiness])

  const create = useCallback(async () => {
    const current = readiness ?? await refreshReadiness()
    if (!current.ready) {
      setError(current.reason ?? "Terminal indisponível")
      return
    }
    setError(undefined)
    try {
      const session = await gateway.createTerminal()
      dispatch({ type: "upsert", session })
      dispatch({ type: "activate", sessionId: session.id })
      setDockOpen(true)
      void refreshReadiness().catch(() => undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      throw cause
    }
  }, [gateway, readiness, refreshReadiness, setDockOpen])

  const close = useCallback(
    async (sessionId: string) => {
      closedSessions.current.add(sessionId)
      try {
        await gateway.closeTerminal(sessionId)
      } catch (error) {
        closedSessions.current.delete(sessionId)
        reportError(error)
        throw error
      }
      sinks.current.delete(sessionId)
      sequences.current.delete(sessionId)
      dispatch({ type: "remove", sessionId })
    },
    [gateway, reportError],
  )

  const interrupt = useCallback(async (sessionId: string) => {
    try {
      await gateway.interruptTerminal(sessionId)
    } catch (cause) {
      reportError(cause)
      throw cause
    }
  }, [gateway, reportError])

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
    readiness,
    error,
    refreshReadiness,
    reportError,
    create,
    close,
    startOperation,
    activate: (sessionId: string) => dispatch({ type: "activate", sessionId }),
    interrupt,
    setDockOpen,
    restoreDockOpen,
    register,
  }
}
