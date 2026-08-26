import { z } from "zod"
import type { WorkbenchRuntimeMode } from "../../auth/runtime-mode"

export const CONTROL_CONTRACT_VERSION = "workbench-control-v1" as const

export function buildControlHealth(mode: WorkbenchRuntimeMode) {
  return {
    status: "ok" as const,
    appId: "matriz-workbench" as const,
    contractVersion: CONTROL_CONTRACT_VERSION,
    mode,
  }
}

const idSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,127}$/)
const evidenceLineSchema = z.string().max(500)

export const controlDiagnosticSchema = z.object({
  projectId: idSchema,
  actionId: z.enum(["dev", "lint", "typecheck", "test"]),
  sessionId: idSchema,
  status: z.enum(["failed", "exited"]),
  exitCode: z.number().int().min(-1).max(255),
  lines: z.array(evidenceLineSchema).min(1).max(80),
  occurredAt: z.string().datetime(),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
}).superRefine((value, context) => {
  if (Buffer.byteLength(JSON.stringify(value.lines), "utf8") > 16 * 1024) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Diagnostic evidence exceeds 16 KiB", path: ["lines"] })
  }
})

export type ControlDiagnosticInput = z.infer<typeof controlDiagnosticSchema>

export const controlRepairResultSchema = z.object({
  actionId: z.enum(["dev", "lint", "typecheck", "test"]),
  attempt: z.number().int().min(1).max(3),
  lease: z.string().regex(/^repair_[0-9a-f-]{36}$/),
  exitCode: z.number().int().min(-1).max(255),
  lines: z.array(evidenceLineSchema).min(1).max(80),
}).superRefine((value, context) => {
  if (Buffer.byteLength(JSON.stringify(value.lines), "utf8") > 16 * 1024) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Repair evidence exceeds 16 KiB", path: ["lines"] })
  }
})

export type ControlRepairResult = z.infer<typeof controlRepairResultSchema>
