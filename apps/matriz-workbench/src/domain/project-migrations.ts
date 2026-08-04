import { z } from "zod"

export const migrationPhaseSchema = z.enum([
  "registration",
  "staging",
  "isolated-runtime",
  "adaptation",
  "parity",
  "shadow",
  "cutover",
  "retirement",
  "closed",
])

export const migrationEvidenceSchema = z.enum([
  "parity",
  "data",
  "auth",
  "contracts",
  "observability",
  "rollback",
])

export const projectMigrationSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^mig_[a-z0-9-]+$/),
  projectId: z.string().min(1),
  owner: z.string().min(1),
  legacySource: z.string().min(1),
  targetSource: z.string().min(1),
  coexistenceDeadline: z.string().datetime(),
  phase: migrationPhaseSchema,
  authoritativeSource: z.enum(["legacy", "target"]),
  evidence: z.array(migrationEvidenceSchema),
  humanCutoverApproved: z.boolean(),
  updatedAt: z.string().datetime(),
})

export type ProjectMigration = z.infer<typeof projectMigrationSchema>
export type MigrationPhase = z.infer<typeof migrationPhaseSchema>
export type MigrationEvidence = z.infer<typeof migrationEvidenceSchema>

export function createProjectMigration(input: Pick<
  ProjectMigration,
  "id" | "projectId" | "owner" | "legacySource" | "targetSource" | "coexistenceDeadline"
>): ProjectMigration {
  return projectMigrationSchema.parse({
    schemaVersion: 1,
    ...input,
    phase: "registration",
    authoritativeSource: "legacy",
    evidence: [],
    humanCutoverApproved: false,
    updatedAt: new Date().toISOString(),
  })
}

const REQUIRED_CUTOVER_EVIDENCE: readonly MigrationEvidence[] = [
  "parity",
  "data",
  "auth",
  "contracts",
  "observability",
  "rollback",
]

export function advanceProjectMigration(
  migration: ProjectMigration,
  phase: MigrationPhase,
  gate: { humanApproved: boolean; evidence: readonly MigrationEvidence[] },
): ProjectMigration {
  const current = projectMigrationSchema.parse(migration)
  const phases = migrationPhaseSchema.options
  if (phases.indexOf(phase) !== phases.indexOf(current.phase) + 1) {
    throw new Error(`Migration can advance only one phase from ${current.phase}.`)
  }
  if (phase === "cutover") {
    if (!gate.humanApproved) throw new Error("Cutover requires human approval.")
    const missing = REQUIRED_CUTOVER_EVIDENCE.filter((item) => !gate.evidence.includes(item))
    if (missing.length) throw new Error(`Cutover has missing evidence: ${missing.join(", ")}.`)
  }
  return projectMigrationSchema.parse({
    ...current,
    phase,
    authoritativeSource: phase === "cutover" ? "target" : current.authoritativeSource,
    evidence: [...new Set([...current.evidence, ...gate.evidence])],
    humanCutoverApproved: phase === "cutover" ? true : current.humanCutoverApproved,
    updatedAt: new Date().toISOString(),
  })
}
