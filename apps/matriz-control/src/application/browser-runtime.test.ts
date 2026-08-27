import { describe, expect, it } from "vitest"
import { BrowserRuntime, MemoryBrowserRepository } from "./browser-runtime"

describe("BrowserRuntime", () => {
  it("creates isolated capsules and opens one active tab at a normalized target", async () => {
    const runtime = new BrowserRuntime({ repository: new MemoryBrowserRepository(), now: () => "2026-08-25T12:00:00.000Z", id: sequenceId() })

    const capsule = await runtime.execute({ type: "capsule.create", name: "Testes", kind: "agent", policy: "agent-safe" })
    const tab = await runtime.execute({ type: "tab.open", capsuleId: capsule.id, input: "localhost:3008/doctor" })

    expect(tab).toMatchObject({ capsuleId: capsule.id, url: "http://localhost:3008/doctor", active: true, status: "loading" })
    expect(await runtime.execute({ type: "tab.list", capsuleId: capsule.id })).toEqual([tab])
  })

  it("keeps capsules isolated when listing tabs", async () => {
    const runtime = new BrowserRuntime({ repository: new MemoryBrowserRepository(), id: sequenceId() })
    const human = await runtime.execute({ type: "capsule.create", name: "Pessoal", kind: "human", policy: "human" })
    const agent = await runtime.execute({ type: "capsule.create", name: "Automação", kind: "agent", policy: "agent-full" })
    await runtime.execute({ type: "tab.open", capsuleId: human.id, input: "https://human.test" })
    await runtime.execute({ type: "tab.open", capsuleId: agent.id, input: "https://agent.test" })

    expect((await runtime.execute({ type: "tab.list", capsuleId: human.id })).map((tab) => tab.url)).toEqual(["https://human.test/"])
    expect((await runtime.execute({ type: "tab.list", capsuleId: agent.id })).map((tab) => tab.url)).toEqual(["https://agent.test/"])
  })

  it("requires explicit delegation before an agent can read a human capsule", async () => {
    const runtime = new BrowserRuntime({ repository: new MemoryBrowserRepository(), id: sequenceId() })
    const human = await runtime.execute({ type: "capsule.create", name: "Pessoal", kind: "human", policy: "human" })

    await expect(runtime.authorizeAgent(human.id, "page.read")).rejects.toThrow(/not delegated/i)
    await runtime.execute({ type: "capsule.delegate", capsuleId: human.id, policy: "agent-safe" })
    await expect(runtime.authorizeAgent(human.id, "page.read")).resolves.toBeUndefined()
    await expect(runtime.authorizeAgent(human.id, "credentials.write")).rejects.toThrow(/blocked/i)
  })
})

function sequenceId() {
  let value = 0
  return (prefix: string) => `${prefix}_${++value}`
}
