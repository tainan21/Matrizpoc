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
}
