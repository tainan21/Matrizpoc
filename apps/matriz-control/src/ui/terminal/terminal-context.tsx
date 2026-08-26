"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { TerminalSession } from "../../domain/terminal"
import { DEFAULT_TERMINAL_PREFERENCES, parseTerminalPreferences, type TerminalPreferences } from "./terminal-preferences"

interface TerminalContextValue extends TerminalPreferences {
  sessions: TerminalSession[]
  activeSession: TerminalSession | null
  setOpen(open: boolean): void
  setPlacement(placement: "bottom" | "right"): void
  setActiveSessionId(id: string | null): void
  resize(delta: number): void
  openSession(projectId: string, actionId?: string, signal?: AbortSignal): Promise<void>
  sendInput(id: string, input: string): Promise<void>
  stop(id: string): Promise<void>
  restart(id: string): Promise<void>
  close(id: string): Promise<void>
}

const TerminalContext = createContext<TerminalContextValue | null>(null)
const storageKey = "matriz-control:terminal"

type TerminalFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export async function mutateTerminal(fetcher: TerminalFetch, url: string, method: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
  const response = await fetcher(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, signal })
  if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Terminal request failed")
  return response.status === 204 ? null : response.json()
}

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_TERMINAL_PREFERENCES)
  const [sessions, setSessions] = useState<TerminalSession[]>([])
  const refresh = useCallback(async () => {
    const response = await fetch("/api/terminal/sessions", { cache: "no-store" })
    if (response.ok) setSessions((await response.json() as { sessions: TerminalSession[] }).sessions)
  }, [])

  useEffect(() => { setPreferences(parseTerminalPreferences(localStorage.getItem(storageKey))); void refresh() }, [refresh])
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(preferences)) }, [preferences])
  useEffect(() => {
    if (!preferences.open && !sessions.some((session) => ["starting", "running", "stopping"].includes(session.status))) return
    const timer = window.setInterval(() => void refresh(), 700)
    return () => window.clearInterval(timer)
  }, [preferences.open, refresh, sessions])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.ctrlKey && event.key.toLowerCase() === "j") { event.preventDefault(); setPreferences((value) => ({ ...value, open: !value.open })) } }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const mutate = useCallback(async (url: string, method: string, body?: unknown, signal?: AbortSignal) => {
    const result = await mutateTerminal(fetch, url, method, body, signal)
    await refresh()
    return result
  }, [refresh])

  const value = useMemo<TerminalContextValue>(() => ({
    ...preferences,
    sessions,
    activeSession: sessions.find((session) => session.id === preferences.activeSessionId) ?? sessions[0] ?? null,
    setOpen: (open) => setPreferences((current) => ({ ...current, open })),
    setPlacement: (placement) => setPreferences((current) => ({ ...current, placement })),
    setActiveSessionId: (activeSessionId) => setPreferences((current) => ({ ...current, activeSessionId })),
    resize: (delta) => setPreferences((current) => current.placement === "bottom" ? { ...current, bottomSize: Math.min(720, Math.max(180, current.bottomSize + delta)) } : { ...current, rightSize: Math.min(900, Math.max(360, current.rightSize + delta)) }),
    openSession: async (projectId, actionId = "dev", signal) => { const session = await mutate("/api/terminal/sessions", "POST", { projectId, actionId }, signal) as TerminalSession; setPreferences((current) => ({ ...current, open: true, activeSessionId: session.id })) },
    sendInput: async (id, input) => { await mutate(`/api/terminal/sessions/${id}/input`, "POST", { input }) },
    stop: async (id) => { await mutate(`/api/terminal/sessions/${id}`, "PATCH") },
    restart: async (id) => { const session = await mutate(`/api/terminal/sessions/${id}/restart`, "POST") as TerminalSession; setPreferences((current) => ({ ...current, activeSessionId: session.id })) },
    close: async (id) => { await mutate(`/api/terminal/sessions/${id}`, "DELETE"); setPreferences((current) => ({ ...current, activeSessionId: null })) },
  }), [mutate, preferences, sessions])
  return <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>
}

export function useTerminal() { const context = useContext(TerminalContext); if (!context) throw new Error("useTerminal requires TerminalProvider"); return context }
