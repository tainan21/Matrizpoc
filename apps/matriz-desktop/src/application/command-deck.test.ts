import { describe, expect, it } from "vitest"

import type { DeckCommand } from "./command-deck"
import { rankCommands } from "./command-deck"

const commands: readonly DeckCommand[] = [
  { id: "seumei-web", label: "Seumei Web", keywords: ["app", "web"], group: "Apps" },
  { id: "seumei-native", label: "Seumei Nativo", keywords: ["app", "desktop"], group: "Apps" },
  { id: "terminal", label: "Nova sessão", keywords: ["powershell", "terminal"], group: "Terminal" },
  { id: "kill-3002", label: "Liberar 3002", keywords: ["kill", "seumei"], group: "Portas", destructive: true },
]

describe("command deck ranking", () => {
  it("matches accent-insensitive tokens and favors label prefixes", () => {
    expect(rankCommands("seu nat", commands, []).map(({ id }) => id)).toEqual([
      "seumei-native",
    ])
    expect(rankCommands("sessao", commands, []).map(({ id }) => id)).toEqual(["terminal"])
  })

  it("uses recent successful actions only as a tiebreaker", () => {
    expect(rankCommands("seumei", commands, ["seumei-native"]).map(({ id }) => id)).toEqual([
      "seumei-native",
      "seumei-web",
      "kill-3002",
    ])
  })

  it("returns a stable safe catalog for an empty query", () => {
    expect(rankCommands("", commands, []).map(({ id }) => id)).toEqual([
      "seumei-web",
      "seumei-native",
      "terminal",
      "kill-3002",
    ])
    expect(rankCommands("whoami.exe", commands, [])).toEqual([])
  })
})
