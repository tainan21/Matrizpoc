import { z } from "zod"

export const CONTROL_CONTRACT_VERSION = "workbench-control-v1" as const

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
