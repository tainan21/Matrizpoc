import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { OutboxDiagnostic } from "../src/domain/desktop-bridge"

const executeFile = promisify(execFile)
type Execute = (file: string, args: readonly string[], options: { windowsHide: boolean; timeout: number; maxBuffer: number; encoding: "utf8" }) => Promise<{ stdout: string }>
export class WindowsOutboxDiagnostics {
  constructor(private readonly helperPath: string, private readonly execute: Execute = async (file, args, options) => executeFile(file, [...args], options)) {}
  async read(): Promise<readonly OutboxDiagnostic[]> {
    const { stdout } = await this.execute("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", this.helperPath], { windowsHide: true, timeout: 15_000, maxBuffer: 16 * 1024, encoding: "utf8" })
    const value = JSON.parse(stdout) as unknown
    if (!Array.isArray(value) || value.some((row) => !valid(row))) throw new Error("Invalid outbox diagnostic response")
    return value
  }
}
function valid(value: unknown): value is OutboxDiagnostic {
  if (!value || typeof value !== "object") return false
  const row = value as Record<string, unknown>
  return ["pay", "seumei", "hub"].includes(String(row.domain)) && [row.pending, row.retries, row.deadLetters].every((item) => Number.isInteger(item) && Number(item) >= 0) && (row.oldestOccurredAt === null || typeof row.oldestOccurredAt === "string") && typeof row.workerConfigured === "boolean"
}
