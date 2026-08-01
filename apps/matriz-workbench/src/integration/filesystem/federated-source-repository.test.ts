import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { FederatedSourceRepository } from "./federated-source-repository"

const roots: string[] = []

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-federated-"))
  const source = await mkdtemp(path.join(os.tmpdir(), "matriz-source-"))
  roots.push(root, source)
  await mkdir(path.join(root, ".matriz", "local"), { recursive: true })
  await mkdir(path.join(source, "docs"), { recursive: true })
  await mkdir(path.join(source, "node_modules", "ignored"), { recursive: true })
  await writeFile(path.join(source, "README.md"), "# External Product\n")
  await writeFile(
    path.join(source, "package.json"),
    JSON.stringify({
      name: "external-product",
      version: "1.2.3",
      scripts: { build: "example", typecheck: "example" },
    }),
  )
  await mkdir(path.join(source, "packages", "tokens"), { recursive: true })
  await writeFile(
    path.join(source, "packages", "tokens", "package.json"),
    JSON.stringify({
      name: "@example/tokens",
      version: "1.0.0",
      exports: {
        ".": "./dist/index.js",
        "./css": "./dist/tokens.css",
      },
      dependencies: {
        "@example/foundation": "workspace:*",
      },
      peerDependencies: {
        react: ">=18",
      },
      scripts: {
        build: "example",
        typecheck: "example",
      },
    }),
  )
  await writeFile(path.join(source, "docs", "architecture.md"), "# Architecture\nUseful context.")
  await writeFile(path.join(source, "node_modules", "ignored", "secret.md"), "# Ignore\n")
  await writeFile(path.join(source, ".env"), "SECRET=value\n")
  await writeFile(
    path.join(root, ".matriz", "repositories.json"),
    JSON.stringify({
      schemaVersion: 1,
      sources: [
        {
          id: "external-product",
          name: "External Product",
          kind: "external_repository",
          gitRemote: "https://github.com/example/external-product.git",
          documentationIncludes: ["README.md", "docs/**/*.md"],
        },
      ],
    }),
  )
  await writeFile(
    path.join(root, ".matriz", "local", "repository-bindings.json"),
    JSON.stringify({
      schemaVersion: 1,
      bindings: [
        {
          sourceId: "external-product",
          absolutePath: source,
          enabled: true,
          access: "read_only",
        },
      ],
    }),
  )
  return { root, source, repository: await FederatedSourceRepository.create(root) }
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("FederatedSourceRepository", () => {
  it("combines portable sources with local read-only bindings", async () => {
    const { repository, source } = await fixture()

    await expect(repository.listSources()).resolves.toEqual([
      expect.objectContaining({
        id: "external-product",
        name: "External Product",
        absolutePath: source,
        available: true,
        access: "read_only",
      }),
    ])
  })

  it("catalogs only allowlisted Markdown without loading its content", async () => {
    const { repository } = await fixture()

    const documents = await repository.listDocuments("external-product")

    expect(documents.map((document) => document.path)).toEqual([
      "README.md",
      "docs/architecture.md",
    ])
    expect(documents[0]).toMatchObject({
      title: "External Product",
      status: "canonical",
      editable: false,
    })
    expect(documents[0]).not.toHaveProperty("content")
    expect(documents[1]).toMatchObject({
      title: "Architecture",
      status: "reference",
    })
  })

  it("projects bounded package metadata without exposing source paths", async () => {
    const { repository } = await fixture()

    await expect(
      repository.getSourceSummary("external-product"),
    ).resolves.toEqual({
      sourceId: "external-product",
      packageName: "external-product",
      version: "1.2.3",
      scripts: ["build", "typecheck"],
      packages: [{ name: "@example/tokens", version: "1.0.0" }],
    })
  })

  it("projects one registered package contract without exposing paths or commands", async () => {
    const { repository } = await fixture()

    await expect(
      repository.getPackageSummary("external-product", "@example/tokens"),
    ).resolves.toEqual({
      sourceId: "external-product",
      name: "@example/tokens",
      version: "1.0.0",
      exports: [".", "./css"],
      dependencies: ["@example/foundation"],
      peerDependencies: ["react"],
      scripts: ["build", "typecheck"],
    })
  })

  it("reads only a cataloged document and rejects traversal", async () => {
    const { repository } = await fixture()

    await expect(
      repository.readDocument("external-product", "docs/architecture.md"),
    ).resolves.toMatchObject({ content: "# Architecture\nUseful context." })
    await expect(
      repository.readDocument("external-product", "../outside.md"),
    ).rejects.toMatchObject({ code: "INVALID_PATH" })
    await expect(
      repository.readDocument("external-product", ".env"),
    ).rejects.toMatchObject({ code: "INVALID_PATH" })
  })

  it("rejects symlinks that leave the registered source", async () => {
    const { repository, source } = await fixture()
    const outside = await mkdtemp(path.join(os.tmpdir(), "matriz-outside-"))
    roots.push(outside)
    await writeFile(path.join(outside, "leak.md"), "# Secret\n")
    await symlink(outside, path.join(source, "docs", "outside"), "junction")

    const documents = await repository.listDocuments("external-product")

    expect(documents.map((document) => document.path)).not.toContain(
      "docs/outside/leak.md",
    )
    await expect(
      repository.readDocument("external-product", "docs/outside/leak.md"),
    ).rejects.toMatchObject({ code: "INVALID_PATH" })
  })
})
