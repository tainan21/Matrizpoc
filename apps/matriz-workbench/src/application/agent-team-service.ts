import { randomUUID } from "node:crypto"
import {
  addEvidence,
  agentProfileSchema,
  createMission,
  createMissionHandoff,
  reviewMission,
  transitionMission,
  type AgentOperationDependencies,
  type AgentProfile,
  type CreateMissionInput,
  type Mission,
  type MissionEvidence,
  type MissionEvidenceInput,
  type MissionHandoff,
  type MissionHandoffInput,
  type ReviewMissionInput,
} from "../domain/agent-operations"

interface AgentTeamRepository {
  initializeAgentTeam(projectId: string): Promise<AgentProfile[]>
  listAgentProfiles(projectId: string): Promise<AgentProfile[]>
  createAgentProfile(projectId: string, profile: AgentProfile): Promise<AgentProfile>
  listAgentMissions(projectId: string): Promise<Mission[]>
  createAgentMission(projectId: string, mission: Mission): Promise<Mission>
  getAgentMission(projectId: string, missionId: string): Promise<Mission>
  updateAgentMission(projectId: string, mission: Mission, expectedRevision: string): Promise<Mission>
  listAgentMissionEvidence(projectId: string, missionId?: string): Promise<MissionEvidence[]>
  recordAgentMissionEvidence(
    projectId: string,
    evidence: MissionEvidence,
    nextMission: Mission,
    expectedMissionRevision: string,
  ): Promise<{ mission: Mission; evidence: MissionEvidence }>
  createAgentMissionHandoff(
    projectId: string,
    handoff: MissionHandoff,
    expectedMissionRevision: string,
  ): Promise<MissionHandoff>
  listAgentMissionHandoffs(projectId: string): Promise<MissionHandoff[]>
}

export interface AgentTeamServiceDependencies extends AgentOperationDependencies {
  createId?: () => string
}

export type CreateTeamMissionInput = Omit<CreateMissionInput, "id" | "projectId">
export type CreateTeamHandoffInput = Omit<MissionHandoffInput, "id">
export type CreateTeamProfileInput = Omit<
  AgentProfile,
  "schemaVersion" | "createdAt" | "updatedAt" | "revision"
>

/** App-local orchestration for profiles, missions, evidence and handoffs. */
export class AgentTeamService {
  constructor(
    private readonly repository: AgentTeamRepository,
    private readonly dependencies: AgentTeamServiceDependencies = {},
  ) {}

  initialize(projectId: string): Promise<AgentProfile[]> {
    return this.repository.initializeAgentTeam(projectId)
  }

  async getTeam(projectId: string): Promise<{
    profiles: AgentProfile[]
    missions: Mission[]
    evidence: MissionEvidence[]
    handoffs: MissionHandoff[]
  }> {
    const [profiles, missions, evidence, handoffs] = await Promise.all([
      this.repository.listAgentProfiles(projectId),
      this.repository.listAgentMissions(projectId),
      this.repository.listAgentMissionEvidence(projectId),
      this.repository.listAgentMissionHandoffs(projectId),
    ])
    return { profiles, missions, evidence, handoffs }
  }

  async createProfile(projectId: string, input: CreateTeamProfileInput): Promise<AgentProfile> {
    const timestamp = this.dependencies.now?.() ?? new Date().toISOString()
    const base = {
      schemaVersion: 1 as const,
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const profile = agentProfileSchema.parse({
      ...base,
      revision: this.dependencies.createRevision?.() ?? randomUUID(),
    })
    return this.repository.createAgentProfile(projectId, profile)
  }

  async createMission(projectId: string, input: CreateTeamMissionInput): Promise<Mission> {
    const mission = createMission({
      ...input,
      id: this.nextId("mission"),
      projectId,
    }, await this.repository.listAgentProfiles(projectId), this.dependencies)
    return this.repository.createAgentMission(projectId, mission)
  }

  async transitionMission(
    projectId: string,
    missionId: string,
    target: Mission["status"],
    expectedRevision: string,
  ): Promise<Mission> {
    const current = await this.repository.getAgentMission(projectId, missionId)
    const next = transitionMission(current, target, expectedRevision, this.dependencies)
    return this.repository.updateAgentMission(projectId, next, expectedRevision)
  }

  async addEvidence(
    projectId: string,
    missionId: string,
    input: MissionEvidenceInput,
    expectedRevision: string,
  ): Promise<{ mission: Mission; evidence: MissionEvidence }> {
    const current = await this.repository.getAgentMission(projectId, missionId)
    const result = addEvidence(current, input, expectedRevision, this.dependencies)
    return this.repository.recordAgentMissionEvidence(
      projectId,
      result.evidence,
      result.mission,
      expectedRevision,
    )
  }

  async createHandoff(
    projectId: string,
    missionId: string,
    input: CreateTeamHandoffInput,
    expectedRevision: string,
  ): Promise<MissionHandoff> {
    const mission = await this.repository.getAgentMission(projectId, missionId)
    const handoff = createMissionHandoff(mission, {
      ...input,
      id: this.nextId("handoff"),
    }, expectedRevision, this.dependencies)
    return this.repository.createAgentMissionHandoff(projectId, handoff, expectedRevision)
  }

  async reviewMission(
    projectId: string,
    missionId: string,
    input: ReviewMissionInput,
    expectedRevision: string,
  ): Promise<Mission> {
    const [current, evidence] = await Promise.all([
      this.repository.getAgentMission(projectId, missionId),
      this.repository.listAgentMissionEvidence(projectId, missionId),
    ])
    const next = reviewMission(current, evidence, input, expectedRevision, this.dependencies)
    return this.repository.updateAgentMission(projectId, next, expectedRevision)
  }

  private nextId(prefix: "mission" | "handoff"): string {
    return this.dependencies.createId?.() ?? `${prefix}_${randomUUID()}`
  }
}
