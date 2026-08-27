import { describe, expect, it } from "vitest"
import { advanceProjectMigration, createProjectMigration } from "./project-migrations"

describe("project migration gates", () => {
  it("starts with the legacy product as the authoritative source", () => {
    const migration = createProjectMigration({
      id: "mig_sample",
      projectId: "sample",
      owner: "matriz-core",
      legacySource: "legacy/sample",
      targetSource: "apps/sample",
      coexistenceDeadline: "2026-08-18T00:00:00.000Z",
    })

    expect(migration.phase).toBe("registration")
    expect(migration.authoritativeSource).toBe("legacy")
  })

  it("blocks cutover without all required evidence and human approval", () => {
    const migration = {
      ...createProjectMigration({
        id: "mig_sample",
        projectId: "sample",
        owner: "matriz-core",
        legacySource: "legacy/sample",
        targetSource: "apps/sample",
        coexistenceDeadline: "2026-08-18T00:00:00.000Z",
      }),
      phase: "shadow" as const,
    }

    expect(() => advanceProjectMigration(migration, "cutover", {
      humanApproved: false,
      evidence: ["parity", "data", "auth", "contracts", "observability", "rollback"],
    })).toThrow("human approval")
    expect(() => advanceProjectMigration(migration, "cutover", {
      humanApproved: true,
      evidence: ["parity", "data", "auth"],
    })).toThrow("missing evidence")
  })

  it("switches authority only at an approved cutover", () => {
    const migration = {
      ...createProjectMigration({
        id: "mig_sample",
        projectId: "sample",
        owner: "matriz-core",
        legacySource: "legacy/sample",
        targetSource: "apps/sample",
        coexistenceDeadline: "2026-08-18T00:00:00.000Z",
      }),
      phase: "shadow" as const,
    }
    const next = advanceProjectMigration(migration, "cutover", {
      humanApproved: true,
      evidence: ["parity", "data", "auth", "contracts", "observability", "rollback"],
    })

    expect(next.authoritativeSource).toBe("target")
    expect(next.phase).toBe("cutover")
  })
})
