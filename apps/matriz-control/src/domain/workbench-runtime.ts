export type WorkbenchRuntimeStatus = "stopped" | "starting" | "ready" | "failed" | "incompatible"

export interface WorkbenchRuntimeSnapshot {
  status: WorkbenchRuntimeStatus
  pid: number | null
  error: string | null
  updatedAt: string
}
