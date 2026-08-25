import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { ProjectBlueprintRepository } from "../integration/filesystem/project-blueprint-repository"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"
import { createProjectBlueprintWorkflow } from "./project-blueprints"

const roots: string[] = []

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-blueprint-"))
  roots.push(root)
  await writeFile(path.join(root, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n')
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "matriz", description: "Portfolio" }),
  )
  await mkdir(path.join(root, "apps", "sample"), { recursive: true })
  await writeFile(
    path.join(root, "apps", "sample", "package.json"),
    JSON.stringify({ name: "@matriz/app-sample" }),
  )
  const workspace = await WorkspaceRepository.create(root)
  await workspace.initializeProject("matriz-infra-hub")
  return {
    root,
    workspace,
    blueprints: await ProjectBlueprintRepository.create(root),
  }
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("project blueprints", () => {
  it("builds a deterministic contract-first preview without creating source", async () => {
    const { root, blueprints } = await fixture()

    const blueprint = await blueprints.create({
      mode: "create",
      name: "Example Product",
      projectKind: "application",
      target: "apps/example-product",
      platforms: ["web", "pwa"],
      ownedDomains: ["catalog"],
      consumedCapabilities: ["identity"],
      sharedCandidates: [],
      templateId: "application-next",
      validationCommands: ["pnpm --filter @matriz/app-example-product typecheck"],
    })

    expect(blueprint.preview.files).toEqual([
      "AGENTS.md",
      "README.md",
      "package.json",
      "next-env.d.ts",
      "tsconfig.json",
      "app/layout.tsx",
      "app/page.tsx",
      "app/api/health/route.ts",
      "docs/AGENT-START-HERE.md",
      "public-contract.ts",
      "src/bootstrap/index.ts",
      "src/manifest/manifest.ts",
      ".matriz/project.json",
    ])
    await expect(
      readdir(path.join(root, "apps")),
    ).resolves.toEqual(["sample"])
    await expect(
      readFile(
        path.join(
          root,
          ".matriz",
          "blueprints",
          `${blueprint.id}.json`,
        ),
        "utf8",
      ),
    ).resolves.toContain('"status": "draft"')
  })

  it("creates a linked backlog item and queued Codex request", async () => {
    const { workspace, blueprints } = await fixture()

    const result = await createProjectBlueprintWorkflow(workspace, blueprints, {
      mode: "create",
      name: "Matriz Sites",
      projectKind: "site_collection",
      target: "apps/sites",
      platforms: ["web"],
      ownedDomains: ["site-catalog"],
      consumedCapabilities: [],
      sharedCandidates: ["metadata-presets"],
      templateId: "site-collection-next",
      validationCommands: ["pnpm --filter @matriz/app-sites typecheck"],
    })

    expect(result.blueprint.status).toBe("requested")
    expect(result.blueprint.backlogItemId).toBe(result.backlog.id)
    expect(result.blueprint.agentRequestId).toBe(result.request.id)
    expect(result.request.status).toBe("queued")
    expect(result.request.instructions).toContain("não execute sem aprovação")
    expect(result.request.instructions).toContain(result.blueprint.id)
  })

  it("keeps library previews free of Next app files and gives sites a health route", async () => {
    const { blueprints } = await fixture()
    const library = await blueprints.create({
      mode: "create", name: "Library", projectKind: "library", target: "apps/library",
      platforms: [], ownedDomains: [], consumedCapabilities: [], sharedCandidates: [],
      templateId: "library-typescript", validationCommands: ["pnpm typecheck"],
    })
    const sites = await blueprints.create({
      mode: "create", name: "Sites", projectKind: "site_collection", target: "apps/site-sample",
      platforms: ["web"], ownedDomains: [], consumedCapabilities: [], sharedCandidates: [],
      templateId: "site-collection-next", validationCommands: ["pnpm typecheck"],
    })

    expect(library.preview.files).not.toContain("app/api/health/route.ts")
    expect(sites.preview.files).toContain("app/api/health/route.ts")
  })
})
