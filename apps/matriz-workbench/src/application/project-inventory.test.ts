import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"
import { buildProjectInventories } from "./project-inventory"

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("project inventory", () => {
  it("maps every app and exposes only sanitized Git/Vercel metadata", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "matriz-inventory-"))
    roots.push(root)
    await writeFile(path.join(root, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n')
    await mkdir(path.join(root, ".git"))
    await writeFile(path.join(root, ".git", "HEAD"), "ref: refs/heads/codex/inventory\n")
    await writeFile(
      path.join(root, ".git", "config"),
      '[remote "origin"]\n  url = https://secret-token@github.com/matriz/ecosystem.git\n',
    )

    for (const id of ["seumei", "spot", "future-app"]) {
      await mkdir(path.join(root, "apps", id), { recursive: true })
      await writeFile(
        path.join(root, "apps", id, "package.json"),
        JSON.stringify({
          name: `@matriz/app-${id}`,
          scripts: { dev: "next dev", typecheck: "tsc --noEmit" },
          dependencies: { next: "16.2.4", react: "19.2.5" },
        }),
      )
    }
    await mkdir(path.join(root, "apps", "spot", ".vercel"), { recursive: true })
    await writeFile(
      path.join(root, "apps", "spot", ".vercel", "project.json"),
      JSON.stringify({ projectName: "spot-web", orgId: "private-org-id" }),
    )

    const inventory = await buildProjectInventories(await WorkspaceRepository.create(root))

    expect(inventory.map((item) => item.project.id)).toEqual(["future-app", "seumei", "spot"])
    expect(inventory[0]?.git).toEqual({
      detected: true,
      branch: "codex/inventory",
      provider: "github",
      host: "github.com",
      repository: "matriz/ecosystem",
    })
    expect(JSON.stringify(inventory)).not.toContain("secret-token")
    expect(JSON.stringify(inventory)).not.toContain("private-org-id")
    expect(inventory.find((item) => item.project.id === "spot")?.vercel).toEqual({
      configured: true,
      scope: "app",
      projectName: "spot-web",
    })
  })
})
