export const TERMINAL_ACTION_IDS = ["dev", "lint", "typecheck", "test"] as const
export type TerminalActionId = (typeof TERMINAL_ACTION_IDS)[number]
export type TerminalStatus = "starting" | "running" | "stopping" | "exited" | "failed"

export interface TerminalAction { id: TerminalActionId; label: string }
export interface TerminalProject { id: string; name: string; path: string; port: number | null; actions: TerminalAction[] }
export interface ResolvedTerminalAction { projectId: string; projectName: string; actionId: TerminalActionId; label: string; command: string; args: string[]; cwd: string }
export interface TerminalSession { id: string; projectId: string; projectName: string; actionId: TerminalActionId; label: string; status: TerminalStatus; pid: number | null; lines: string[]; startedAt: string; exitCode: number | null; error: string | null }
