import type {
  AgentProfile,
  AuthorityLevel,
  Mission,
  MissionEvidence,
  MissionHandoff,
} from "../../domain/agent-operations"

const AUTHORITY_LABELS: Record<AuthorityLevel, string> = {
  observe: "Observação",
  propose: "Proposta",
  change_scoped: "Alteração delimitada",
  execute_approved: "Execução aprovada",
}

const STATUS_LABELS: Record<Mission["status"], string> = {
  assigned: "Atribuída",
  in_progress: "Em andamento",
  in_review: "Em revisão",
  completed: "Concluída",
  cancelled: "Cancelada",
}

export interface AgentProfileViewModel {
  id: string
  displayName: string
  persona: string
  authorityLabel: string
  capabilities: readonly string[]
}

export interface AgentMissionViewModel {
  id: string
  title: string
  objective: string
  agentName: string
  authorityLabel: string
  statusLabel: string
  allowedPaths: readonly string[]
  evidenceCount: number
  handoffCount: number
  needsHumanReview: boolean
  canRecordArtifacts: boolean
  transitionOptions: readonly { value: Mission["status"]; label: string }[]
  revision: string
}

export interface AgentTeamViewModel {
  profiles: readonly AgentProfileViewModel[]
  missions: readonly AgentMissionViewModel[]
}

export function toAgentTeamViewModel({
  profiles,
  missions,
  evidence,
  handoffs,
}: {
  profiles: readonly AgentProfile[]
  missions: readonly Mission[]
  evidence: readonly MissionEvidence[]
  handoffs: readonly MissionHandoff[]
}): AgentTeamViewModel {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const evidenceCountByMission = countByMission(evidence)
  const handoffCountByMission = countByMission(handoffs)

  return {
    profiles: profiles.map((profile) => ({
      id: profile.id,
      displayName: profile.displayName,
      persona: profile.personaSummary,
      authorityLabel: AUTHORITY_LABELS[profile.defaultAuthority],
      capabilities: profile.capabilityIds,
    })),
    missions: missions.map((mission) => ({
      id: mission.id,
      title: mission.title,
      objective: mission.objective,
      agentName: profileById.get(mission.profileId)?.displayName ?? "Perfil indisponível",
      authorityLabel: AUTHORITY_LABELS[mission.authority],
      statusLabel: STATUS_LABELS[mission.status],
      allowedPaths: mission.allowedPaths,
      evidenceCount: evidenceCountByMission.get(mission.id) ?? 0,
      handoffCount: handoffCountByMission.get(mission.id) ?? 0,
      needsHumanReview: mission.status === "in_review" && mission.humanReview === undefined,
      canRecordArtifacts: mission.status !== "completed" && mission.status !== "cancelled",
      transitionOptions: transitionOptionsFor(mission.status),
      revision: mission.revision,
    })),
  }
}

function transitionOptionsFor(status: Mission["status"]): AgentMissionViewModel["transitionOptions"] {
  if (status === "assigned") return [{ value: "in_progress", label: "Iniciar" }, { value: "cancelled", label: "Cancelar" }]
  if (status === "in_progress") return [{ value: "in_review", label: "Enviar para revisão" }, { value: "cancelled", label: "Cancelar" }]
  if (status === "in_review") return [{ value: "in_progress", label: "Retomar" }, { value: "cancelled", label: "Cancelar" }]
  return []
}

function countByMission(
  records: readonly Pick<MissionEvidence | MissionHandoff, "missionId">[],
): Map<string, number> {
  return records.reduce((counts, record) => {
    counts.set(record.missionId, (counts.get(record.missionId) ?? 0) + 1)
    return counts
  }, new Map<string, number>())
}
