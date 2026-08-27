import { describe, expect, it } from "vitest"
import type { Mission, MissionHandoff } from "../domain/agent-operations"
import { AgentTeamService } from "./agent-team-service"

describe("AgentTeamService", () => {
  it("creates a bounded mission for an initialized seeded profile", async () => {
    const stored: unknown[] = []
    const profiles = [{
      schemaVersion: 1 as const,
      id: "nilo-builder",
      displayName: "Nilo Builder",
      personaSummary: "Scoped code agent.",
      missionStatement: "Deliver bounded code changes.",
      capabilityIds: ["code-change"],
      defaultAuthority: "change_scoped" as const,
      humanOwner: "Tai",
      createdAt: "2026-08-27T12:00:00.000Z",
      updatedAt: "2026-08-27T12:00:00.000Z",
      revision: "profile-revision",
    }]
    const service = new AgentTeamService({
      initializeAgentTeam: async () => profiles,
      listAgentProfiles: async () => profiles,
      createAgentMission: async (_projectId: string, mission: Mission) => {
        stored.push(mission)
        return mission
      },
    } as never, {
      now: () => "2026-08-27T12:00:00.000Z",
      createId: () => "mission_00000000-0000-4000-8000-000000000001",
      createRevision: () => "mission-revision",
    })

    const mission = await service.createMission("sample", {
      profileId: "nilo-builder",
      title: "Persist scoped work",
      objective: "Keep the team model local to the project.",
      allowedPaths: ["src/application"],
      authority: "change_scoped",
      contextReferences: ["docs/architecture.md"],
      acceptanceCriteria: ["Mission is persisted atomically."],
    })

    expect(mission).toMatchObject({
      id: "mission_00000000-0000-4000-8000-000000000001",
      projectId: "sample",
      status: "assigned",
      evidenceIds: [],
    })
    expect(stored).toEqual([mission])
  })

  it("records a human-authored handoff without granting execution authority", async () => {
    const mission = {
      schemaVersion: 1 as const,
      id: "mission_00000000-0000-4000-8000-000000000001",
      profileId: "zara-link",
      projectId: "sample",
      title: "Prepare context",
      objective: "Leave a reviewable handoff.",
      allowedPaths: ["docs"],
      authority: "propose" as const,
      status: "assigned" as const,
      contextReferences: [],
      acceptanceCriteria: [],
      evidenceIds: [],
      createdAt: "2026-08-27T12:00:00.000Z",
      updatedAt: "2026-08-27T12:00:00.000Z",
      revision: "mission-revision",
    }
    const stored: unknown[] = []
    const service = new AgentTeamService({
      getAgentMission: async () => mission,
      createAgentMissionHandoff: async (
        _projectId: string,
        handoff: MissionHandoff,
        expectedRevision: string,
      ) => {
        stored.push({ handoff, expectedRevision })
        return handoff
      },
    } as never, {
      now: () => "2026-08-27T12:01:00.000Z",
      createId: () => "handoff_00000000-0000-4000-8000-000000000002",
    })

    const handoff = await service.createHandoff("sample", mission.id, {
      contextSummary: "The team record is ready for review.",
      decisions: ["Keep authority at propose."],
      risks: [],
      nextStep: "Ask the human to review the mission.",
      authoredBy: { kind: "human", id: "human_00000000-0000-4000-8000-000000000003" },
    }, mission.revision)

    expect(handoff).toMatchObject({ missionId: mission.id, id: "handoff_00000000-0000-4000-8000-000000000002" })
    expect(stored).toEqual([{ handoff, expectedRevision: mission.revision }])
  })

  it("creates an app-local profile with a revisioned timestamp", async () => {
    const stored: unknown[] = []
    const service = new AgentTeamService({
      createAgentProfile: async (_projectId: string, profile: unknown) => {
        stored.push(profile)
        return profile
      },
    } as never, {
      now: () => "2026-08-27T12:01:00.000Z",
      createRevision: () => "profile-revision",
    })

    const profile = await service.createProfile("sample", {
      id: "context-scout",
      displayName: "Context Scout",
      personaSummary: "Finds bounded project context.",
      missionStatement: "Prepare reviewable context for a human-owned mission.",
      capabilityIds: ["context-synthesis"],
      defaultAuthority: "observe",
      humanOwner: "Tai",
    })

    expect(profile).toMatchObject({
      id: "context-scout",
      schemaVersion: 1,
      createdAt: "2026-08-27T12:01:00.000Z",
      revision: "profile-revision",
    })
    expect(stored).toEqual([profile])
  })
})
