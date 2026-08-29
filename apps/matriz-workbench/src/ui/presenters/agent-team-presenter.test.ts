import { describe, expect, it } from "vitest"
import type { AgentProfile, Mission, MissionEvidence, MissionHandoff } from "../../domain/agent-operations"
import { toAgentTeamViewModel } from "./agent-team-presenter"

const profile: AgentProfile = {
  schemaVersion: 1,
  id: "nilo-builder",
  displayName: "Nilo Builder",
  personaSummary: "Entrega mudanças técnicas delimitadas.",
  missionStatement: "Produzir evidência revisável.",
  capabilityIds: ["code-change"],
  defaultAuthority: "change_scoped",
  humanOwner: "Tai",
  createdAt: "2026-08-29T10:00:00.000Z",
  updatedAt: "2026-08-29T10:00:00.000Z",
  revision: "profile-revision",
}

const mission: Mission = {
  schemaVersion: 1,
  id: "mission_00000000-0000-4000-8000-000000000001",
  profileId: profile.id,
  projectId: "matriz-workbench",
  title: "Mapear o contexto",
  objective: "Preparar um resumo revisável.",
  allowedPaths: ["src", "docs"],
  authority: "propose",
  status: "in_review",
  contextReferences: [],
  acceptanceCriteria: ["Resumo"],
  evidenceIds: ["evidence_00000000-0000-4000-8000-000000000001"],
  createdAt: "2026-08-29T10:00:00.000Z",
  updatedAt: "2026-08-29T10:05:00.000Z",
  revision: "mission-revision",
}

const evidence: MissionEvidence = {
  schemaVersion: 1,
  id: mission.evidenceIds[0],
  missionId: mission.id,
  kind: "note",
  summary: "Resumo criado.",
  note: "Contexto pronto para revisão.",
  recordedBy: "Nilo Builder",
  recordedAt: "2026-08-29T10:04:00.000Z",
}

const handoff: MissionHandoff = {
  schemaVersion: 1,
  id: "handoff_00000000-0000-4000-8000-000000000001",
  missionId: mission.id,
  contextSummary: "Resumo disponível.",
  decisions: ["Manter local-first"],
  risks: [],
  nextStep: "Revisar a missão.",
  authoredBy: { kind: "human", id: "human_00000000-0000-4000-8000-000000000001" },
  createdAt: "2026-08-29T10:03:00.000Z",
}

describe("toAgentTeamViewModel", () => {
  it("exposes a review-ready mission as UI data without raw domain records", () => {
    const view = toAgentTeamViewModel({ profiles: [profile], missions: [mission], evidence: [evidence], handoffs: [handoff] })

    expect(view).toEqual({
      profiles: [{ id: "nilo-builder", displayName: "Nilo Builder", persona: profile.personaSummary, authorityLabel: "Alteração delimitada", capabilities: ["code-change"] }],
      missions: [{ id: mission.id, title: mission.title, objective: mission.objective, agentName: "Nilo Builder", authorityLabel: "Proposta", statusLabel: "Em revisão", allowedPaths: ["src", "docs"], evidenceCount: 1, handoffCount: 1, needsHumanReview: true, canRecordArtifacts: true, transitionOptions: [{ value: "in_progress", label: "Retomar" }, { value: "cancelled", label: "Cancelar" }], revision: mission.revision }],
    })
  })
})
