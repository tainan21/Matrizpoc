import { describe, expect, it } from "vitest"
import {
  addEvidence,
  agentProfileSchema,
  createMission,
  createMissionHandoff,
  missionHandoffSchema,
  missionSchema,
  reviewMission,
  safeRelativePathSchema,
  transitionMission,
  type AgentProfile,
  type Mission,
} from "./agent-operations"

const timestamp = "2026-08-27T12:00:00.000Z"
const nextTimestamp = "2026-08-27T12:05:00.000Z"
const humanReviewer = { kind: "human" as const, id: "human_11111111-1111-4111-8111-111111111111" }

function profile(): AgentProfile {
  return agentProfileSchema.parse({
    schemaVersion: 1,
    id: "nilo-builder",
    displayName: "Nilo Builder",
    personaSummary: "Implementa missões de código delimitadas.",
    missionStatement: "Entregar mudanças verificáveis dentro do escopo aprovado.",
    capabilityIds: ["workbench.agents.coordinate"],
    defaultAuthority: "change_scoped",
    humanOwner: "Tai",
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: "profile-1",
  })
}

function mission(overrides: Partial<Mission> = {}): Mission {
  return missionSchema.parse({
    schemaVersion: 1,
    id: "mission_11111111-1111-4111-8111-111111111111",
    profileId: "nilo-builder",
    projectId: "matriz-workbench",
    title: "Criar núcleo de agentes",
    objective: "Manter o domínio local e auditável.",
    allowedPaths: ["src/domain/agent-operations.ts"],
    authority: "change_scoped",
    status: "assigned",
    contextReferences: ["docs/superpowers/specs/agent-kernel.md"],
    acceptanceCriteria: ["Testes focais passam."],
    evidenceIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: "mission-1",
    ...overrides,
  })
}

describe("agent operations domain", () => {
  it("rejects malformed operational profiles", () => {
    const result = agentProfileSchema.safeParse({ ...profile(), capabilityIds: ["not valid"] })

    expect(result.success).toBe(false)
  })

  it("creates an assigned mission only for a known profile", () => {
    const created = createMission({
      id: "mission_22222222-2222-4222-8222-222222222222",
      profileId: "nilo-builder",
      projectId: "matriz-workbench",
      title: "Validar o núcleo",
      objective: "Executar os testes focais.",
      allowedPaths: ["src/domain/agent-operations.ts"],
      authority: "change_scoped",
      contextReferences: [],
      acceptanceCriteria: ["O teste focal passa."],
    }, [profile()], { now: () => timestamp, createRevision: () => "mission-2" })

    expect(created).toMatchObject({ status: "assigned", evidenceIds: [], revision: "mission-2" })
    expect(() => createMission({
      id: "mission_22222222-2222-4222-8222-222222222222",
      profileId: "unknown-agent",
      projectId: "matriz-workbench",
      title: "Sem dono",
      objective: "Não deve ser criada.",
      allowedPaths: ["src/domain/agent-operations.ts"],
      authority: "observe",
      contextReferences: [],
      acceptanceCriteria: [],
    }, [profile()], { now: () => timestamp, createRevision: () => "mission-2" })).toThrow(/perfil/i)
  })

  it("accepts only normalized safe relative mission paths", () => {
    expect(safeRelativePathSchema.parse("src/domain/agent-operations.ts")).toBe("src/domain/agent-operations.ts")
    for (const invalidPath of [
      "../secrets",
      "/absolute/path",
      "C:\\workspace\\file.ts",
      "src\\domain\\file.ts",
      "./src/file.ts",
      "src//file.ts",
      " src/file.ts",
      "src/file.ts ",
      "src/\0file.ts",
    ]) {
      expect(safeRelativePathSchema.safeParse(invalidPath).success).toBe(false)
    }
  })

  it("fails closed when persisted completed mission data lacks evidence or an approved human review", () => {
    expect(missionSchema.safeParse({ ...mission(), status: "completed" }).success).toBe(false)
    expect(missionSchema.safeParse({ ...mission(),
      status: "completed",
      evidenceIds: ["evidence_11111111-1111-4111-8111-111111111111"],
      humanReview: {
        decision: "changes_requested",
        reviewer: humanReviewer,
        reviewedAt: timestamp,
        note: "Ainda não.",
      },
    }).success).toBe(false)
  })

  it("enforces collection limits in persisted profiles and missions", () => {
    expect(agentProfileSchema.safeParse({
      ...profile(),
      capabilityIds: Array.from({ length: 51 }, (_, index) => `capability-${index}`),
    }).success).toBe(false)
    expect(missionSchema.safeParse({
      ...mission(),
      allowedPaths: Array.from({ length: 101 }, (_, index) => `src/file-${index}.ts`),
    }).success).toBe(false)
  })

  it("rejects non-adjacent mission transitions", () => {
    expect(() => transitionMission(mission(), "completed", "mission-1", {
      now: () => nextTimestamp,
      createRevision: () => "mission-2",
    })).toThrow(/fluxo/i)
  })

  it("appends evidence only from the current mission revision", () => {
    expect(() => addEvidence(mission(), {
      id: "evidence_11111111-1111-4111-8111-111111111111",
      kind: "test",
      command: "pnpm test -- agent-operations.test.ts",
      summary: "Teste focal passou.",
      recordedBy: "Nilo Builder",
    }, "stale-revision", { now: () => nextTimestamp, createRevision: () => "mission-2" })).toThrow(/recarregue/i)

    const result = addEvidence(mission(), {
      id: "evidence_11111111-1111-4111-8111-111111111111",
      kind: "test",
      command: "pnpm test -- agent-operations.test.ts",
      summary: "Teste focal passou.",
      recordedBy: "Nilo Builder",
    }, "mission-1", { now: () => nextTimestamp, createRevision: () => "mission-2" })

    expect(result.mission).toMatchObject({ evidenceIds: [result.evidence.id], revision: "mission-2" })
    expect(result.evidence).toMatchObject({ missionId: result.mission.id, recordedAt: nextTimestamp })
  })

  it("rejects stale revisions for every mission mutation", () => {
    expect(() => transitionMission(mission(), "in_progress", "stale-revision", {
      now: () => nextTimestamp,
      createRevision: () => "mission-2",
    })).toThrow(/recarregue/i)

    expect(() => reviewMission(mission({ status: "in_review" }), [], {
      decision: "changes_requested",
      reviewer: humanReviewer,
      note: "Ainda não.",
    }, "stale-revision", { now: () => nextTimestamp, createRevision: () => "mission-2" })).toThrow(/recarregue/i)
  })

  it("keeps file evidence inside the mission's allowed paths", () => {
    expect(() => addEvidence(mission(), {
      id: "evidence_11111111-1111-4111-8111-111111111111",
      kind: "file",
      path: "src/other-app/private.ts",
      summary: "Arquivo fora do escopo.",
      recordedBy: "Nilo Builder",
    }, "mission-1", { now: () => nextTimestamp, createRevision: () => "mission-2" })).toThrow(/escopo/i)
  })

  it("creates an append-only human-authored handoff for the current mission revision", () => {
    const handoff = createMissionHandoff(mission(), {
      id: "handoff_11111111-1111-4111-8111-111111111111",
      contextSummary: "A missão já possui o domínio e os testes focais.",
      decisions: ["Manter o domínio local no Workbench."],
      risks: ["A persistência ainda será implementada em uma etapa posterior."],
      nextStep: "Adicionar o repositório file-backed.",
      authoredBy: humanReviewer,
    }, "mission-1", { now: () => nextTimestamp })

    expect(handoff).toMatchObject({
      schemaVersion: 1,
      id: "handoff_11111111-1111-4111-8111-111111111111",
      missionId: "mission_11111111-1111-4111-8111-111111111111",
      authoredBy: humanReviewer,
      createdAt: nextTimestamp,
    })
  })

  it("rejects handoffs that exceed their bounded payload or do not reference the current mission revision", () => {
    expect(missionHandoffSchema.safeParse({
      schemaVersion: 1,
      id: "handoff_11111111-1111-4111-8111-111111111111",
      missionId: "not-a-mission-id",
      contextSummary: "Contexto válido.",
      decisions: Array.from({ length: 101 }, () => "Decisão válida."),
      risks: [],
      nextStep: "Próximo passo válido.",
      authoredBy: humanReviewer,
      createdAt: timestamp,
    }).success).toBe(false)

    expect(() => createMissionHandoff(mission(), {
      id: "handoff_11111111-1111-4111-8111-111111111111",
      contextSummary: "Contexto válido.",
      decisions: [],
      risks: [],
      nextStep: "Próximo passo válido.",
      authoredBy: humanReviewer,
    }, "stale-revision", { now: () => nextTimestamp })).toThrow(/recarregue/i)
  })

  it("requires evidence and a distinct human reviewer before completion", () => {
    const inReview = mission({ status: "in_review" })
    expect(() => reviewMission(inReview, [], {
      decision: "approved",
      reviewer: humanReviewer,
      note: "Pronto.",
    }, "mission-1", { now: () => nextTimestamp, createRevision: () => "mission-2" })).toThrow(/evidência/i)

    const { mission: evidenced, evidence } = addEvidence(inReview, {
      id: "evidence_11111111-1111-4111-8111-111111111111",
      kind: "note",
      note: "Revisão manual disponível.",
      summary: "Evidência registrada.",
      recordedBy: "Nilo Builder",
    }, "mission-1", { now: () => nextTimestamp, createRevision: () => "mission-2" })

    expect(() => reviewMission(evidenced, [evidence], {
      decision: "approved",
      reviewer: { kind: "human", id: "nilo-builder" },
      note: "Autorrevisão.",
    }, "mission-2", { now: () => nextTimestamp, createRevision: () => "mission-3" })).toThrow(/humana/i)

    expect(() => reviewMission(evidenced, [evidence], {
      decision: "approved",
      reviewer: { kind: "agent", id: "nilo-builder" },
      note: "Autorrevisão disfarçada.",
    } as never, "mission-2", { now: () => nextTimestamp, createRevision: () => "mission-3" })).toThrow()

    const completed = reviewMission(evidenced, [evidence], {
      decision: "approved",
      reviewer: humanReviewer,
      note: "Entrega aprovada.",
    }, "mission-2", { now: () => nextTimestamp, createRevision: () => "mission-3" })

    expect(completed).toMatchObject({
      status: "completed",
      humanReview: { decision: "approved", reviewer: humanReviewer },
      revision: "mission-3",
    })
  })
})
