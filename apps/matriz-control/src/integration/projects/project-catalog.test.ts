import { mkdtemp, mkdir, realpath, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { listTerminalProjects, resolveTerminalAction, terminalRoute } from "./project-catalog"

async function workspace() {
  const root = await mkdtemp(join(tmpdir(), "matriz-control-"))
  const app = join(root, "apps", "demo")
  await mkdir(app, { recursive: true })
  await writeFile(join(app, "package.json"), JSON.stringify({
    name: "@matriz/app-demo",
    version: "4.2.0",
    scripts: { dev: "next dev --port=3999", lint: "eslint .", dangerous: "format C:" },
  }))
  return { root, app }
}

describe("project catalog", () => {
  it("maps workspace paths to lowercase mih routes", () => {
    expect(terminalRoute("C:/Apps/Matriz-Infra-Hub", "C:/Apps/Matriz-Infra-Hub/apps/Matriz-Control")).toBe("mih/apps/matriz-control")
    expect(() => terminalRoute("C:/Apps/Matriz-Infra-Hub", "C:/outside")).toThrow("Path outside workspace")
  })
  it("exposes only supported package scripts", async () => {
    const { root } = await workspace()
    const projects = await listTerminalProjects(root)
    expect(projects).toHaveLength(1)
    expect(projects[0]?.port).toBe(3999)
    expect(projects[0]?.version).toBe("4.2.0")
    expect(projects[0]?.actions.map((action) => action.id)).toEqual(["dev", "lint"])
  })

  it("does not expose invalid declared ports", async () => {
    const { root, app } = await workspace()
    await writeFile(join(app, "package.json"), JSON.stringify({ name: "@matriz/app-demo", version: "4.2.0", scripts: { dev: "next dev --port=99999" } }))
    expect((await listTerminalProjects(root))[0]?.port).toBeNull()
  })

  it("resolves cwd and command on the server", async () => {
    const { root, app } = await workspace()
    const action = await resolveTerminalAction(root, "demo", "dev")
    expect(action).toMatchObject({ projectId: "demo", actionId: "dev", command: "corepack", args: ["pnpm", "run", "dev"] })
    expect(action.cwd).toBe(await realpath(app))
  })

  it("rejects unknown projects and actions", async () => {
    const { root } = await workspace()
    await expect(resolveTerminalAction(root, "../outside", "dev")).rejects.toThrow("Invalid project")
    await expect(resolveTerminalAction(root, "demo", "dangerous")).rejects.toThrow("Unsupported action")
  })
})
