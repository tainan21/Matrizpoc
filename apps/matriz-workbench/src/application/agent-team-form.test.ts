import { describe, expect, it } from "vitest"
import { parseAgentTeamForm } from "./agent-team-form"

function form(entries: readonly (readonly [string, string])[]): FormData {
  const data = new FormData()
  entries.forEach(([key, value]) => data.set(key, value))
  return data
}

describe("parseAgentTeamForm", () => {
  it("parses a bounded mission form without granting implicit authority", () => {
    const parsed = parseAgentTeamForm("mission", form([
      ["projectId", "matriz-workbench"],
      ["profileId", "nilo-builder"],
      ["title", "Mapear contexto"],
      ["objective", "Produzir um resumo."],
      ["allowedPaths", "src\ndocs"],
      ["authority", "propose"],
      ["contextReferences", "docs/AGENT-START-HERE.md"],
      ["acceptanceCriteria", "Resumo revisável"],
    ]))

    expect(parsed).toEqual(expect.objectContaining({
      projectId: "matriz-workbench",
      input: expect.objectContaining({
        authority: "propose",
        allowedPaths: ["src", "docs"],
      }),
    }))
  })

  it("rejects an attempt to submit a source escape as evidence", () => {
    expect(() => parseAgentTeamForm("evidence", form([
      ["projectId", "matriz-workbench"],
      ["missionId", "mission_00000000-0000-4000-8000-000000000001"],
      ["revision", "mission-revision"],
      ["kind", "file"],
      ["summary", "Invalid"],
      ["recordedBy", "Nilo Builder"],
      ["reference", "../.env"],
    ]))).toThrow()
  })

  it("rejects an unknown human-review decision instead of treating it as approval", () => {
    expect(() => parseAgentTeamForm("review", form([
      ["projectId", "matriz-workbench"],
      ["missionId", "mission_00000000-0000-4000-8000-000000000001"],
      ["revision", "mission-revision"],
      ["decision", "anything_else"],
      ["reviewerId", "human_00000000-0000-4000-8000-000000000001"],
      ["note", "Tentativa inválida."],
    ]))).toThrow()
  })
})
