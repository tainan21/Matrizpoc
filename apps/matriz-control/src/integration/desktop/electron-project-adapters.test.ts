import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir, homedir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { ElectronProjectRootAdapter } from "../../../desktop/electron-project-adapters"

const dirs: string[] = []
afterEach(async () => { for (const path of dirs.splice(0)) await rm(path, { recursive: true, force: true }) })

describe("ElectronProjectRootAdapter", () => {
  it("returns only an opaque candidate and resolves it natively once", async () => {
    const root = await mkdtemp(join(tmpdir(), "matriz-external-root-")); dirs.push(root)
    const adapter = new ElectronProjectRootAdapter({ pickDirectory: async () => root, findRegisteredPath: async () => undefined, policy: { homeDirectory: homedir(), windowsDirectory: process.env.SystemRoot ?? "C:\\Windows", programFilesDirectories: [process.env.ProgramFiles ?? "C:\\Program Files"] }, id: () => "candidate_1", rootId: () => "root_1" })
    const candidate = await adapter.pick()
    expect(candidate).toEqual({ candidateId: "candidate_1" })
    expect(JSON.stringify(candidate)).not.toContain(root)
    await expect(adapter.registerCandidate("candidate_unknown")).rejects.toThrow("Unknown or expired root candidate")
    await expect(adapter.registerCandidate("candidate_1")).resolves.toMatchObject({ rootRef: "root_1", canonicalPath: root })
    await expect(adapter.registerCandidate("candidate_1")).rejects.toThrow("Unknown or expired root candidate")
  })

  it("rejects a sensitive selected root", async () => {
    const adapter = new ElectronProjectRootAdapter({ pickDirectory: async () => homedir(), findRegisteredPath: async () => undefined, policy: { homeDirectory: homedir(), windowsDirectory: process.env.SystemRoot ?? "C:\\Windows", programFilesDirectories: [process.env.ProgramFiles ?? "C:\\Program Files"] }, id: () => "candidate_1", rootId: () => "root_1" })
    const candidate = await adapter.pick()
    await expect(adapter.registerCandidate(candidate!.candidateId)).rejects.toThrow("Project root is too broad or sensitive")
  })

  it("resolves registered roots without exposing a renderer-supplied path", async () => {
    const adapter = new ElectronProjectRootAdapter({ pickDirectory: async () => null, findRegisteredPath: async (rootRef) => rootRef === "root_1" ? "C:\\Projects\\Demo" : undefined, policy: { homeDirectory: homedir(), windowsDirectory: process.env.SystemRoot ?? "C:\\Windows", programFilesDirectories: [process.env.ProgramFiles ?? "C:\\Program Files"] }, id: () => "candidate", rootId: () => "root" })
    await expect(adapter.resolve("root_1")).resolves.toBe("C:\\Projects\\Demo")
    await expect(adapter.resolve("C:\\attacker")).rejects.toThrow("Unknown project root")
  })
})
