export const TERMINAL_ACTION_IDS = ["dev", "lint", "typecheck", "test"] as const
export type TerminalActionId = (typeof TERMINAL_ACTION_IDS)[number]
export type TerminalStatus = "starting" | "running" | "stopping" | "exited" | "failed"

export interface TerminalAction { id: TerminalActionId; label: string }
export interface TerminalProject { id: string; name: string; version: string | null; path: string; port: number | null; actions: TerminalAction[] }
export interface ResolvedTerminalAction { projectId: string; projectName: string; actionId: string; label: string; command: string; args: string[]; cwd: string; route?: string; port?: number | null }
export interface TerminalSession { id: string; projectId: string; projectName: string; actionId: string; label: string; route: string; port: number | null; status: TerminalStatus; pid: number | null; memoryBytes?: number | null; validationLabel?: string; lines: string[]; startedAt: string; exitCode: number | null; error: string | null }
