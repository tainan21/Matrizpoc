import { z } from "zod"

const baseUrl = "http://127.0.0.1:3005"

const healthSchema = z.object({
  status: z.literal("ok"),
  appId: z.literal("matriz-workbench"),
  contractVersion: z.literal("workbench-control-v1"),
  mode: z.literal("control-desktop"),
})

const diagnosticResultSchema = z.object({
  diagnosticId: z.string().min(1).max(128),
  state: z.string().min(1).max(64),
  occurrences: z.number().int().positive(),
})

const repairLeaseSchema = z.object({
  diagnosticId: z.string().regex(/^diag_[a-f0-9]{64}$/),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,127}$/),
  actionId: z.enum(["dev", "lint", "typecheck", "test"]),
  attempt: z.number().int().min(1).max(3),
  lease: z.string().regex(/^repair_[0-9a-f-]{36}$/),
})

const repairResultSchema = z.object({
  diagnosticId: z.string().regex(/^diag_[a-f0-9]{64}$/),
  state: z.string().min(1).max(64),
})

export type WorkbenchRepairLease = z.infer<typeof repairLeaseSchema>
export interface WorkbenchRepairResultInput extends WorkbenchRepairLease {
  exitCode: number
  lines: string[]
}

export interface WorkbenchDiagnosticInput {
  projectId: string
  actionId: "dev" | "lint" | "typecheck" | "test"
  sessionId: string
  status: "failed" | "exited"
  exitCode: number
  lines: string[]
  occurredAt: string
  fingerprint: string
}

interface WorkbenchClientOptions {
  capability: string
  fetcher?: typeof fetch
}

export class WorkbenchClient {
  private readonly fetcher: typeof fetch

  constructor(private readonly options: WorkbenchClientOptions) {
    this.fetcher = options.fetcher ?? fetch
  }

  private headers(extra: Record<string, string> = {}) {
    return { authorization: `Bearer ${this.options.capability}`, ...extra }
  }

  async health() {
    const response = await this.fetcher(`${baseUrl}/api/control/health`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(1_000),
    })
    if (!response.ok) throw new Error("Workbench health unavailable")
    const parsed = healthSchema.safeParse(await response.json())
    if (!parsed.success) throw new Error("Workbench runtime is incompatible")
    return parsed.data
  }

  async sendDiagnostic(input: WorkbenchDiagnosticInput) {
    const response = await this.fetcher(`${baseUrl}/api/control/diagnostics`, {
      method: "POST",
      headers: this.headers({ "content-type": "application/json" }),
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(2_000),
    })
    if (!response.ok) throw new Error("Workbench diagnostic delivery failed")
    return diagnosticResultSchema.parse(await response.json())
  }

  async nextRepair(): Promise<WorkbenchRepairLease | undefined> {
    const response = await this.fetcher(`${baseUrl}/api/control/repairs/next`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(2_000),
    })
    if (response.status === 204) return undefined
    if (!response.ok) throw new Error("Workbench repair queue unavailable")
    return repairLeaseSchema.parse(await response.json())
  }

  async reportRepairResult(input: WorkbenchRepairResultInput) {
    const { diagnosticId, projectId: _projectId, ...body } = input
    const response = await this.fetcher(`${baseUrl}/api/control/repairs/${diagnosticId}/result`, {
      method: "POST",
      headers: this.headers({ "content-type": "application/json" }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2_000),
    })
    if (!response.ok) throw new Error("Workbench repair result delivery failed")
    return repairResultSchema.parse(await response.json())
  }
}
