import { z } from "zod"

export const controlDiagnosticStateSchema = z.enum([
  "open",
  "repairing",
  "cooling_down",
  "rerun_requested",
  "resolved",
  "blocked",
])

export const persistedControlDiagnosticSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^diag_[a-f0-9]{64}$/),
  projectId: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,127}$/),
  actionId: z.enum(["dev", "lint", "typecheck", "test"]),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  state: controlDiagnosticStateSchema,
  occurrences: z.number().int().positive(),
  latestEvidence: z.array(z.string().max(500)).min(1).max(80),
  latestSessionId: z.string().min(1).max(128),
  latestExitCode: z.number().int().min(-1).max(255),
  repairAttempts: z.number().int().min(0).max(3),
  agentRequestId: z.string().max(128).optional(),
  codexRunRevision: z.string().max(128).optional(),
  cooldownUntil: z.string().datetime().optional(),
  rerunLease: z.string().max(128).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
})

export type ControlDiagnostic = z.infer<typeof persistedControlDiagnosticSchema>

export function repairCooldownMs(attempt: number): number {
  if (attempt === 1) return 30_000
  if (attempt === 2) return 120_000
  return 600_000
}

export function automaticRepairDecision(attempts: number):
  | { allowed: true; nextAttempt: number; cooldownMs: number }
  | { allowed: false; reason: "attempt_limit" } {
  if (attempts >= 3) return { allowed: false, reason: "attempt_limit" }
  const nextAttempt = attempts + 1
  return { allowed: true, nextAttempt, cooldownMs: repairCooldownMs(nextAttempt) }
}
