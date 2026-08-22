import { describe, expect, it } from "vitest"
import { parseRouteFlow, routeFlowToMarkdown } from "./route-flow"

describe("route flow scratchpad", () => {
  it("parses ordered relative routes and outcomes", () => {
    expect(parseRouteFlow("/login — autenticar\n/ — escolher empresa\n/workspace — trabalhar")).toEqual({
      kind: "valid",
      steps: [
        { route: "/login", outcome: "autenticar" },
        { route: "/", outcome: "escolher empresa" },
        { route: "/workspace", outcome: "trabalhar" },
      ],
    })
  })

  it("reports the exact invalid line without accepting external URLs", () => {
    expect(parseRouteFlow("/login — entrar\nhttps://evil.test — sair")).toEqual({
      kind: "invalid", line: 2,
      message: "Use uma rota relativa iniciada por /",
    })
  })

  it("exports a readable markdown flow", () => {
    const parsed = parseRouteFlow("/login — entrar\n/workspace — operar")
    if (parsed.kind !== "valid") throw new Error("expected valid flow")
    expect(routeFlowToMarkdown("Acesso", parsed.steps)).toContain("`/login` → entrar")
  })
})
