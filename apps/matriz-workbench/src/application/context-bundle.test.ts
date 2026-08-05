import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { WorkspaceRepository } from "../integration/filesystem/workspace-repository"
import { buildContextBundle } from "./context-bundle"

const roots: string[] = []

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-context-"))
  roots.push(root)
  await writeFile(path.join(root, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n')
  await mkdir(path.join(root, "apps", "sample"), { recursive: true })
  await writeFile(
    path.join(root, "apps", "sample", "package.json"),
    JSON.stringify({ name: "@matriz/app-sample", description: "Sample project" }),
  )
  await writeFile(path.join(root, "apps", "sample", "AGENTS.md"), "A".repeat(2_000))
  return WorkspaceRepository.create(root)
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("buildContextBundle", () => {
  it("honors the compact context budget and reports truncation", async () => {
    const repository = await fixture()
    await repository.initializeProject("sample")
    const task = await repository.createBacklogItem("sample", {
      title: "Token-conscious task",
      description: "B".repeat(2_000),
      priority: "high",
      tags: ["tokens"],
    })

    const bundle = await buildContextBundle(repository, "sample", {
      backlogItemId: task.id,
      budgetChars: 1_000,
    })

    expect(bundle.budgetChars).toBe(1_000)
    expect(bundle.truncated).toBe(true)
    expect(bundle.content.length).toBeLessThanOrEqual(1_000)
    expect(bundle.content).toContain("[contexto truncado")
    expect(bundle.content).toContain("Protocolo operacional do Workbench")
    expect(bundle.cursor).toContain(task.revision)
  })

  it("caps an oversized request at the project absolute budget", async () => {
    const repository = await fixture()
    await repository.initializeProject("sample")
    const bundle = await buildContextBundle(repository, "sample", {
      budgetChars: 100_000,
    })

    expect(bundle.budgetChars).toBe(40_000)
    expect(bundle.content).toContain("A change may be recorded without changing the score")
  })

  it("includes only repository files explicitly linked by the task", async () => {
    const repository = await fixture()
    await mkdir(path.join(repository.repositoryRoot, "docs"), { recursive: true })
    await writeFile(
      path.join(repository.repositoryRoot, "docs", "linked-guide.md"),
      "# Linked guide\nRead only when the task asks for it.",
    )
    await writeFile(
      path.join(repository.repositoryRoot, "docs", "unlinked-guide.md"),
      "# Unlinked guide\nThis must stay out of compact context.",
    )
    await repository.initializeProject("sample")
    const created = await repository.createBacklogItem("sample", {
      title: "Read a linked repository guide",
      description: "",
      priority: "medium",
      tags: [],
    })
    const task = await repository.updateBacklogItem(
      "sample",
      created.id,
      {
        references: [
          {
            kind: "repository_file",
            path: "docs/linked-guide.md",
            label: "Linked guide",
          },
        ],
      },
      created.revision,
    )

    const bundle = await buildContextBundle(repository, "sample", {
      backlogItemId: task.id,
      budgetChars: 12_000,
    })

    expect(bundle.content).toContain("Linked guide")
    expect(bundle.content).toContain("Read only when the task asks for it.")
    expect(bundle.content).not.toContain("This must stay out of compact context.")
  })
})
