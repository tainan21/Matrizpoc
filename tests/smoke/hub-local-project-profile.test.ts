import { afterEach, describe, expect, it } from "vitest"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  findMatrizRepositoryRoot,
  readLocalProjectProfile,
} from "../../apps/matriz-hub/src/institutional/integration/local-project-profile-adapter"

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe("Hub local project profile adapter", () => {
  it("finds the workspace root from an app working directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "matriz-engineering-"))
    roots.push(root)
    const appRoot = path.join(root, "apps", "matriz-hub")
    await mkdir(appRoot, { recursive: true })
    await writeFile(path.join(root, "pnpm-workspace.yaml"), "packages: []")

    await expect(findMatrizRepositoryRoot(appRoot)).resolves.toBe(root)
  })

  it("returns executable commands and existing documentation for a workspace app", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "matriz-engineering-"))
    roots.push(root)
    const appRoot = path.join(root, "apps", "spot")
    await mkdir(path.join(appRoot, "docs"), { recursive: true })
    await writeFile(
      path.join(appRoot, "package.json"),
      JSON.stringify({
        name: "@matriz/app-spot",
        scripts: { dev: "next dev -p 3001", lint: "eslint .", typecheck: "tsc --noEmit" },
      }),
    )
    await writeFile(path.join(appRoot, "README.md"), "# Spot")
    await writeFile(path.join(appRoot, "docs", "AGENT-START-HERE.md"), "# Start")
    await writeFile(path.join(appRoot, "docs", "ADR-001.md"), "# Decision")

    const profile = await readLocalProjectProfile({
      repositoryRoot: root,
      appId: "spot",
      projectId: "matriz:spot",
      localUrl: "http://localhost:3001",
    })

    expect(profile).toEqual({
      projectId: "matriz:spot",
      appId: "spot",
      packageName: "@matriz/app-spot",
      availability: "available",
      commands: {
        dev: "pnpm --filter @matriz/app-spot dev",
        lint: "pnpm --filter @matriz/app-spot lint",
        typecheck: "pnpm --filter @matriz/app-spot typecheck",
      },
      documentation: [
        { kind: "readme", path: "apps/spot/README.md" },
        { kind: "agent-guide", path: "apps/spot/docs/AGENT-START-HERE.md" },
        { kind: "adr", path: "apps/spot/docs/ADR-001.md" },
      ],
      localUrl: "http://localhost:3001",
    })
  })

  it("returns unavailable instead of throwing when the app is not present", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "matriz-engineering-"))
    roots.push(root)

    const profile = await readLocalProjectProfile({
      repositoryRoot: root,
      appId: "missing",
      projectId: "matriz:missing",
    })

    expect(profile.availability).toBe("unavailable")
    expect(profile.commands).toEqual({})
    expect(profile.documentation).toEqual([])
  })
})
