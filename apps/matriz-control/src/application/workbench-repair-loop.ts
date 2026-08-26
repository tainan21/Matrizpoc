import type {
  WorkbenchRepairLease,
  WorkbenchRepairResultInput,
} from "../integration/workbench/workbench-client"

interface RepairClient {
  nextRepair(): Promise<WorkbenchRepairLease | undefined>
  reportRepairResult(input: WorkbenchRepairResultInput): Promise<unknown>
}

interface RepairTerminal {
  start(projectId: string, actionId: WorkbenchRepairLease["actionId"]): Promise<{ id: string }>
  waitForExit(id: string): Promise<{ exitCode: number | null; lines: string[]; error: string | null }>
}

export class WorkbenchRepairLoop {
  private running = false

  constructor(
    private readonly client: RepairClient,
    private readonly terminal: RepairTerminal,
  ) {}

  async runOnce(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const repair = await this.client.nextRepair()
      if (!repair) return
      const session = await this.terminal.start(repair.projectId, repair.actionId)
      const result = await this.terminal.waitForExit(session.id)
      const lines = [...result.lines, ...(result.error ? [result.error] : [])].slice(-80)
      await this.client.reportRepairResult({
        ...repair,
        exitCode: result.exitCode ?? -1,
        lines: lines.length ? lines : ["Process exited without output."],
      })
    } finally {
      this.running = false
    }
  }

  startPolling(intervalMs = 1_000): () => void {
    const timer = setInterval(() => { void this.runOnce().catch(() => undefined) }, intervalMs)
    return () => clearInterval(timer)
  }
}
